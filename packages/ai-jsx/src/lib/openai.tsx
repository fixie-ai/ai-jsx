/**
 * This module provides interfaces to OpenAI's various models.
 * @packageDocumentation
 */

import { Jsonifiable, MergeExclusive } from 'type-fest';
import {
  ChatProvider,
  CompletionProvider,
  FunctionDefinition,
  ModelProps,
  ModelPropsWithChildren,
  getParametersSchema,
} from '../core/completion.js';
import { AssistantMessage, ConversationMessage, FunctionCall, renderToConversation } from '../core/conversation.js';
import { AIJSXError, ErrorCode } from '../core/errors.js';
import { Image, ImageGenPropsWithChildren } from '../core/image-gen.js';
import * as AI from '../index.js';
import { Node } from '../index.js';
import { getEnvVar, patchedUntruncateJson } from './util.js';
import { OpenAI as OpenAIClient } from 'openai';
export { OpenAI as OpenAIClient } from 'openai';
import { FinalRequestOptions } from 'openai/core';
import { debugRepresentation } from '../core/debug.js';
import { getEncoding } from 'js-tiktoken';
import _ from 'lodash';

// https://platform.openai.com/docs/models/model-endpoint-compatibility
export type ValidCompletionModel =
  | 'text-davinci-003'
  | 'text-davinci-002'
  | 'text-curie-001'
  | 'text-babbage-001'
  | 'text-ada-001';

export type ValidChatModel =
  | 'gpt-4'
  | 'gpt-4-0314' // discontinue on 06/13/2024
  | 'gpt-4-0613'
  | 'gpt-4-32k'
  | 'gpt-4-32k-0314' // discontinue on 06/13/2024
  | 'gpt-4-32k-0613'
  | 'gpt-3.5-turbo'
  | 'gpt-3.5-turbo-0301' // discontinue on 06/13/2024
  | 'gpt-3.5-turbo-0613'
  | 'gpt-3.5-turbo-16k'
  | 'gpt-3.5-turbo-16k-0613';

/**
 * An OpenAI client that talks to the Azure OpenAI service.
 * - Adds an API version in the query string.
 * - Uses Api-Key instead of Authorization for the auth header.
 * - Includes the deployment name in the path; note that deployment names cannot contain dots.
 */
class AzureOpenAIClient extends OpenAIClient {
  protected override defaultQuery() {
    return { 'api-version': '2023-07-01-preview' };
  }
  protected override authHeaders() {
    return {
      'Api-Key': this.apiKey,
    };
  }
  override buildRequest(options: FinalRequestOptions) {
    if (options.body && 'model' in options.body) {
      const model = (options.body.model as string).replace('.', '');
      options.path = `/deployments/${model}${options.path}`;
    }
    return super.buildRequest(options);
  }
}

const openAiClientContext = AI.createContext<() => OpenAIClient>(
  _.once(() => {
    const baseURL = getEnvVar('OPENAI_API_BASE', false);
    const useAzure = baseURL?.endsWith('azure.com');
    const apiKey = getEnvVar(useAzure ? 'OPENAI_AZURE_API_KEY' : 'OPENAI_API_KEY', false);
    const config = {
      apiKey,
      dangerouslyAllowBrowser: Boolean(getEnvVar('REACT_APP_OPENAI_API_KEY', false)),
      // N.B. `baseURL` needs to be _unspecified_ rather than undefined
      ...(baseURL ? { baseURL } : {}),
      // TODO: Figure out a better way to work around NextJS fetch blocking streaming
      fetch: ((globalThis as any)._nextOriginalFetch ?? globalThis.fetch).bind(globalThis),
    };
    return useAzure ? new AzureOpenAIClient(config) : new OpenAIClient(config);
  })
);

/**
 * An AI.JSX component that invokes an OpenAI Large Language Model.
 * @param children The children to render.
 * @param chatModel The chat model to use.
 * @param completionModel The completion model to use.
 * @param client The OpenAI client.
 */
export function OpenAI({
  children,
  chatModel,
  completionModel,
  client,
  ...defaults
}: {
  children: Node;
  client?: OpenAIClient;
  chatModel?: ValidChatModel;
  completionModel?: ValidCompletionModel;
} & ModelProps) {
  let result = children;

  if (client) {
    result = <openAiClientContext.Provider value={() => client}>{children}</openAiClientContext.Provider>;
  }

  if (chatModel) {
    result = (
      <ChatProvider component={OpenAIChatModel} {...defaults} model={chatModel}>
        {result}
      </ChatProvider>
    );
  }

  if (completionModel) {
    result = (
      <CompletionProvider component={OpenAICompletionModel} {...defaults} model={completionModel}>
        {result}
      </CompletionProvider>
    );
  }

  return result;
}

const getEncoder = _.once(() => getEncoding('cl100k_base'));

function logitBiasOfTokens(tokens: Record<string, number>) {
  const tokenizer = getEncoder();
  return Object.fromEntries(
    Object.entries(tokens).map(([token, bias]) => {
      const encoded = tokenizer.encode(token);
      if (encoded.length > 1) {
        throw new AIJSXError(
          `You can only set logit_bias for a single token, but "${bias}" is ${encoded.length} tokens.`,
          ErrorCode.LogitBiasBadInput,
          'user'
        );
      }
      return [encoded[0], bias];
    })
  );
}

/**
 * Returns true if the given model supports function calling.
 * @param model The model to check.
 * @returns True if the model supports function calling, false otherwise.
 */
function chatModelSupportsFunctions(model: ValidChatModel) {
  return model.startsWith('gpt-4') || model.startsWith('gpt-3.5-turbo');
}

/**
 * Represents an OpenAI text completion model (e.g., `text-davinci-003`).
 */
export async function* OpenAICompletionModel(
  props: ModelPropsWithChildren & { model: ValidCompletionModel; logitBias?: Record<string, number> },
  { render, getContext, logger }: AI.ComponentContext
): AI.RenderableStream {
  yield AI.AppendOnlyStream;

  const openai = getContext(openAiClientContext)();
  const completionRequest = {
    model: props.model,
    max_tokens: props.maxTokens,
    temperature: props.temperature,
    top_p: props.topP,
    prompt: await render(props.children),
    stop: props.stop,
    stream: true as const,
    logit_bias: props.logitBias ? logitBiasOfTokens(props.logitBias) : undefined,
  };
  logger.debug({ completionRequest }, 'Calling createCompletion');

  let completionResponse;
  try {
    completionResponse = await openai.completions.create(completionRequest);
  } catch (ex) {
    if (ex instanceof OpenAIClient.APIError) {
      throw new AIJSXError(
        `OpenAI API Error: ${ex.message}`,
        ErrorCode.OpenAIAPIError,
        'ambiguous',
        ex.error as Jsonifiable
      );
    }

    throw ex;
  }

  let resultSoFar = '';
  for await (const event of completionResponse) {
    logger.trace({ event }, 'Got createCompletion event');
    yield event.choices[0].text;
    resultSoFar += event.choices[0].text;
  }

  logger.debug({ completion: resultSoFar }, 'Finished createCompletion');

  return AI.AppendOnlyStream;
}

function estimateFunctionTokenCount(functions: Record<string, FunctionDefinition>): number {
  // According to https://community.openai.com/t/how-to-calculate-the-tokens-when-using-function-call/266573
  // function definitions are serialized as TypeScript. We'll use JSON-serialization as an approximation (which
  // is almost certainly an overestimate).
  return getEncoder().encode(JSON.stringify(functions)).length;
}

function tokenLimitForChatModel(
  model: ValidChatModel,
  functionDefinitions?: Record<string, FunctionDefinition>
): number | undefined {
  const TOKENS_CONSUMED_BY_REPLY_PREFIX = 3;
  const functionEstimate =
    chatModelSupportsFunctions(model) && functionDefinitions ? estimateFunctionTokenCount(functionDefinitions) : 0;

  switch (model) {
    case 'gpt-4':
    case 'gpt-4-0314':
    case 'gpt-4-0613':
      return 8192 - functionEstimate - TOKENS_CONSUMED_BY_REPLY_PREFIX;
    case 'gpt-4-32k':
    case 'gpt-4-32k-0314':
    case 'gpt-4-32k-0613':
      return 32768 - functionEstimate - TOKENS_CONSUMED_BY_REPLY_PREFIX;
    case 'gpt-3.5-turbo':
    case 'gpt-3.5-turbo-0301':
    case 'gpt-3.5-turbo-0613':
      return 4096 - functionEstimate - TOKENS_CONSUMED_BY_REPLY_PREFIX;
    case 'gpt-3.5-turbo-16k':
    case 'gpt-3.5-turbo-16k-0613':
      return 16384 - functionEstimate - TOKENS_CONSUMED_BY_REPLY_PREFIX;
    default:
      return undefined;
  }
}

async function tokenCountForConversationMessage(
  message: ConversationMessage,
  render: AI.RenderContext['render']
): Promise<number> {
  const TOKENS_PER_MESSAGE = 3;
  const TOKENS_PER_NAME = 1;
  const encoder = getEncoder();
  switch (message.type) {
    case 'user':
      return (
        TOKENS_PER_MESSAGE +
        encoder.encode(await render(message.element)).length +
        (message.element.props.name ? encoder.encode(message.element.props.name).length + TOKENS_PER_NAME : 0)
      );
    case 'assistant':
    case 'system':
      return TOKENS_PER_MESSAGE + encoder.encode(await render(message.element)).length;
    case 'functionCall':
      return (
        TOKENS_PER_MESSAGE +
        TOKENS_PER_NAME +
        encoder.encode(message.element.props.name).length +
        encoder.encode(JSON.stringify(message.element.props.args)).length
      );
    case 'functionResponse':
      return (
        TOKENS_PER_MESSAGE +
        TOKENS_PER_NAME +
        encoder.encode(await render(message.element.props.children)).length +
        encoder.encode(message.element.props.name).length
      );
  }
}

/**
 * Represents an OpenAI text chat model (e.g., `gpt-4`).
 */
export async function* OpenAIChatModel(
  props: ModelPropsWithChildren & {
    model: ValidChatModel;
    logitBias?: Record<string, number>;
  } & MergeExclusive<
      {
        functionDefinitions: Record<string, FunctionDefinition>;
        forcedFunction: string;
      },
      {
        functionDefinitions?: never;
        forcedFunction?: never;
      }
    >,
  { render, getContext, logger, memo }: AI.ComponentContext
): AI.RenderableStream {
  if (props.functionDefinitions) {
    if (!chatModelSupportsFunctions(props.model)) {
      throw new AIJSXError(
        `The ${props.model} model does not support function calling, but function definitions were provided.`,
        ErrorCode.ChatModelDoesNotSupportFunctions,
        'user'
      );
    }
  }

  if (props.forcedFunction && !Object.keys(props.functionDefinitions).includes(props.forcedFunction)) {
    throw new AIJSXError(
      `The function ${props.forcedFunction} was forced, but no function with that name was defined.`,
      ErrorCode.ChatCompletionBadInput,
      'user'
    );
  }

  yield AI.AppendOnlyStream;

  let promptTokenLimit = tokenLimitForChatModel(props.model, props.functionDefinitions);

  // If reservedTokens (or maxTokens) is set, reserve that many tokens for the reply.
  if (promptTokenLimit !== undefined) {
    promptTokenLimit -= props.reservedTokens ?? props.maxTokens ?? 0;
  }

  const conversationMessages = await renderToConversation(
    props.children,
    render,
    logger,
    'prompt',
    tokenCountForConversationMessage,
    promptTokenLimit
  );

  const messages: OpenAIClient.Chat.CreateChatCompletionRequestMessage[] = await Promise.all(
    conversationMessages.map(async (message) => {
      switch (message.type) {
        case 'system':
          return {
            role: 'system',
            content: await render(message.element),
          };
        case 'user':
          return {
            role: 'user',
            content: await render(message.element),
            name: message.element.props.name,
          };
        case 'assistant':
          return {
            role: 'assistant',
            content: await render(message.element),
          };
        case 'functionCall':
          return {
            role: 'assistant',
            content: '',
            function_call: {
              name: message.element.props.name,
              arguments: JSON.stringify(message.element.props.args),
            },
          };
        case 'functionResponse':
          return {
            role: 'function',
            name: message.element.props.name,
            content: await render(message.element.props.children),
          };
      }
    })
  );

  if (!messages.length) {
    throw new AIJSXError(
      "ChatCompletion must have at least one child that's a SystemMessage, UserMessage, AssistantMessage, FunctionCall, or FunctionResponse, but no such children were found.",
      ErrorCode.ChatCompletionMissingChildren,
      'user'
    );
  }

  const openaiFunctions = !props.functionDefinitions
    ? []
    : Object.entries(props.functionDefinitions).map(([functionName, functionDefinition]) => ({
        name: functionName,
        description: functionDefinition.description,
        parameters: getParametersSchema(functionDefinition.parameters),
      }));

  const openai = getContext(openAiClientContext)();
  const chatCompletionRequest = {
    model: props.model,
    max_tokens: props.maxTokens,
    temperature: props.temperature,
    top_p: props.topP,
    messages,
    functions: openaiFunctions.length > 0 ? openaiFunctions : undefined,
    function_call: props.forcedFunction ? { name: props.forcedFunction } : undefined,
    stop: props.stop,
    logit_bias: props.logitBias ? logitBiasOfTokens(props.logitBias) : undefined,
    stream: true as const,
  };

  logger.debug({ chatCompletionRequest }, 'Calling createChatCompletion');
  let chatResponse;
  try {
    chatResponse = await openai.chat.completions.create(chatCompletionRequest);
  } catch (ex) {
    if (ex instanceof OpenAIClient.APIError) {
      throw new AIJSXError(
        `OpenAI API Error: ${ex.message}`,
        ErrorCode.OpenAIAPIError,
        'ambiguous',
        ex.error as Jsonifiable
      );
    }

    throw ex;
  }
  const iterator = chatResponse[Symbol.asyncIterator]();

  // We have a single response iterator, but we'll wrap tokens _within_ the structure of <AssistantMessage> or <FunctionCall>
  // components. This:
  //  - Allows our stream to be append-only and therefore eagerly rendered in append-only contexts.
  //  - Preserves the output structure to allow callers to extract/separate <AssistantMessage> and <FunctionCall> messages.
  //  - Allows the intermediate states of the stream to include "partial" <FunctionCall> elements with healed JSON.
  //
  // This requires some gymnastics because several components will share a single iterator that can only be consumed once.
  // That is, the logical loop execution is spread over multiple functions (closures over the shared iterator).
  async function advance() {
    const next = await iterator.next();
    if (next.done) {
      return null;
    }

    logger.trace({ deltaMessage: next.value }, 'Got delta message');
    return next.value.choices[0].delta;
  }

  let isAssistant = false;
  let delta = await advance();
  const outputMessages = [] as AI.Node[];
  while (delta !== null) {
    if (delta.role === 'assistant') {
      isAssistant = true;
    }

    if (isAssistant && delta.content) {
      // Memoize the stream to ensure it renders only once.
      let accumulatedContent = '';
      let complete = false;
      const Stream = async function* (): AI.RenderableStream {
        yield AI.AppendOnlyStream;

        while (delta !== null) {
          if (delta.content) {
            accumulatedContent += delta.content;
            yield delta.content;
          }
          if (delta.function_call) {
            break;
          }
          delta = await advance();
        }
        complete = true;

        return AI.AppendOnlyStream;
      };
      const assistantMessage = memo(
        <AssistantMessage>
          <Stream {...debugRepresentation(() => `${accumulatedContent}${complete ? '' : '▮'}`)} />
        </AssistantMessage>
      );
      yield assistantMessage;

      // Ensure the assistant stream is flushed by rendering it.
      await render(assistantMessage);
      outputMessages.push(assistantMessage);
    }

    // TS doesn't realize that the Stream closure can make `delta` be `null`.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (delta?.function_call) {
      // Memoize the stream to ensure it renders only once.
      const functionCallStream = memo(
        (async function* () {
          let name = '';
          let argsJson = '';
          while (delta != null) {
            if (!delta.function_call) {
              break;
            }

            if (delta.function_call.name) {
              name += delta.function_call.name;
            }

            if (delta.function_call.arguments) {
              argsJson += delta.function_call.arguments;
            }

            yield <FunctionCall partial name={name} args={JSON.parse(patchedUntruncateJson(argsJson || '{}'))} />;

            delta = await advance();
          }

          return <FunctionCall name={name} args={JSON.parse(argsJson || '{}')} />;
        })()
      );
      yield functionCallStream;

      // Ensure the functionCallStream is flushed by rendering it.
      await render(functionCallStream);
      outputMessages.push(functionCallStream);
    }

    // TS doesn't realize that the functionCallStream closure can make `delta` be `null`.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (delta !== null) {
      delta = await advance();
    }
  }

  // Render the completion conversation to log it.
  await renderToConversation(outputMessages, render, logger, 'completion', tokenCountForConversationMessage);
  return AI.AppendOnlyStream;
}

/**
 * Generates an image from a prompt using the DALL-E model.
 * @see https://platform.openai.com/docs/guides/images/introduction
 *
 * @param numSamples The number of images to generate. Defaults to 1.
 * @param size The size of the image to generate. Defaults to `512x512`.
 * @returns URL(s) to the generated image, wrapped in {@link Image} component(s).
 */
export async function* DalleImageGen(
  { numSamples = 1, size = '512x512', children }: ImageGenPropsWithChildren,
  { render, getContext, logger }: AI.ComponentContext
) {
  // Consider emitting http://via.placeholder.com/256x256 instead.
  yield (
    <Image
      url={`http://via.placeholder.com/${size}`}
      prompt="placeholder while real results renderes"
      modelName="placeholder.com"
    />
  );

  const prompt = await render(children);

  const openai = getContext(openAiClientContext)();

  const imageRequest = {
    prompt,
    n: numSamples,
    size,
    response_format: 'url' as const,
  };

  logger.debug({ imageRequest }, 'Calling createImage');

  const response = await openai.images.generate(imageRequest);

  logger.debug({ size: response.data.length }, 'createImage succeeded');

  // return all image URLs as {@link Image} components.
  return response.data.flatMap((image) =>
    image.url ? [<Image url={image.url} prompt={prompt} modelName="Dalle" />] : []
  );
}
