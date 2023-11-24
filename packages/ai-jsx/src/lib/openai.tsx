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
  | 'text-ada-001'
  | 'gpt-3.5-turbo-instruct';

export type ValidChatModel =
  | 'gpt-4'
  | 'gpt-4-0314' // discontinue on 06/13/2024
  | 'gpt-4-0613'
  | 'gpt-4-32k'
  | 'gpt-4-32k-0314' // discontinue on 06/13/2024
  | 'gpt-4-32k-0613'
  | 'gpt-4-1106-preview'
  | 'gpt-3.5-turbo'
  | 'gpt-3.5-turbo-0301' // discontinue on 06/13/2024
  | 'gpt-3.5-turbo-0613'
  | 'gpt-3.5-turbo-16k'
  | 'gpt-3.5-turbo-16k-0613'
  | 'gpt-3.5-turbo-1106';

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
      options.path = `openai/deployments/${model}${options.path}`;
    }
    return super.buildRequest(options);
  }
}

const openAiClientContext = AI.createContext<() => OpenAIClient>(
  _.once(() => {
    const baseURL = getEnvVar('OPENAI_API_BASE', false);
    const useAzure = baseURL && new URL(baseURL).hostname.endsWith('.azure.com');
    const apiKey = getEnvVar(useAzure ? 'AZURE_OPENAI_API_KEY' : 'OPENAI_API_KEY', false);
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

// Preload the tokenizer to avoid a large delay on first use.
const cl100kTokenizer = getEncoding('cl100k_base');
export const tokenizer = {
  encode: (text: string) => cl100kTokenizer.encode(text),
  decode: (tokens: number[]) => cl100kTokenizer.decode(tokens),
};

function logitBiasOfTokens(tokens: Record<string, number>) {
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
  return tokenizer.encode(JSON.stringify(functions)).length;
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
    case 'gpt-4-1106-preview':
      return 128_000 - functionEstimate - TOKENS_CONSUMED_BY_REPLY_PREFIX;
    case 'gpt-3.5-turbo':
    case 'gpt-3.5-turbo-0301':
    case 'gpt-3.5-turbo-0613':
      return 4096 - functionEstimate - TOKENS_CONSUMED_BY_REPLY_PREFIX;
    case 'gpt-3.5-turbo-16k':
    case 'gpt-3.5-turbo-16k-0613':
    case 'gpt-3.5-turbo-1106':
      return 16384 - functionEstimate - TOKENS_CONSUMED_BY_REPLY_PREFIX;
    default: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _: never = model;
      return undefined;
    }
  }
}

async function tokenCountForConversationMessage(
  message: ConversationMessage,
  render: AI.RenderContext['render']
): Promise<number> {
  const TOKENS_PER_MESSAGE = 3;
  const TOKENS_PER_NAME = 1;
  switch (message.type) {
    case 'user':
      return (
        TOKENS_PER_MESSAGE +
        tokenizer.encode(await render(message.element)).length +
        (message.element.props.name ? tokenizer.encode(message.element.props.name).length + TOKENS_PER_NAME : 0)
      );
    case 'assistant':
    case 'system':
      return TOKENS_PER_MESSAGE + tokenizer.encode(await render(message.element)).length;
    case 'functionCall':
      return (
        TOKENS_PER_MESSAGE +
        TOKENS_PER_NAME +
        tokenizer.encode(message.element.props.name).length +
        tokenizer.encode(JSON.stringify(message.element.props.args)).length
      );
    case 'functionResponse':
      return (
        TOKENS_PER_MESSAGE +
        TOKENS_PER_NAME +
        tokenizer.encode(await render(message.element.props.children)).length +
        tokenizer.encode(message.element.props.name).length
      );
  }
}

/**
 * Identifies any FunctionCall/FunctionResponse IDs that should be represented as ID-less function calls in the completion request.
 */
function getUnmatchedFunctionIds(messages: ConversationMessage[]): Set<string> {
  let activeFunctionCalls: string[] = [];
  let activeFunctionResponses: string[] = [];
  const unmatchedIds = new Set<string>(); // IDs that should be represented as ID-less function calls because they were part of an unmatched block.

  const flushActiveIds = () => {
    const dedupedFunctionCalls = new Set(activeFunctionCalls);
    const dedupedFunctionResponses = new Set(activeFunctionResponses);

    // If there were any duplicated IDs, or any IDs were in one set but not the other, _all_ the IDs are invalid.
    const isInvalid =
      dedupedFunctionCalls.size !== activeFunctionCalls.length ||
      dedupedFunctionResponses.size !== activeFunctionResponses.length ||
      !activeFunctionCalls.every((id) => dedupedFunctionResponses.has(id)) ||
      !activeFunctionResponses.every((id) => dedupedFunctionCalls.has(id));

    if (isInvalid) {
      for (const id of activeFunctionCalls) {
        unmatchedIds.add(id);
      }
      for (const id of activeFunctionResponses) {
        unmatchedIds.add(id);
      }
    }

    activeFunctionCalls = [];
    activeFunctionResponses = [];
  };

  for (const message of messages) {
    if (message.type === 'functionCall') {
      if (activeFunctionResponses.length > 0) {
        flushActiveIds();
      }

      const id = message.element.props.id;
      if (id) {
        activeFunctionCalls.push(id);
      }
    } else if (message.type === 'functionResponse') {
      const id = message.element.props.id;
      if (id) {
        activeFunctionResponses.push(id);
      }
    } else {
      flushActiveIds();
    }
  }
  flushActiveIds();

  return unmatchedIds;
}

/**
 * Coalesces adjacent assistant messages with tool calls into single messages.
 */
function coalesceToolCallMessages(
  messages: OpenAIClient.Chat.ChatCompletionMessageParam[]
): OpenAIClient.Chat.ChatCompletionMessageParam[] {
  return messages.reduce<OpenAIClient.Chat.ChatCompletionMessageParam[]>((mergedMessages, message) => {
    if (message.role === 'assistant' && message.tool_calls && message.content === '') {
      const lastMessage = mergedMessages[mergedMessages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.tool_calls) {
        // Merge with the last message.
        return [
          ...mergedMessages.slice(0, -1),
          {
            ...lastMessage,
            tool_calls: [...lastMessage.tool_calls, ...message.tool_calls],
          },
        ];
      }
    }
    return mergedMessages.concat([message]);
  }, []);
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

  // OpenAI requires that tool calls with IDs be immediately followed by tool messages with the corresponding IDs.
  // Walk through the conversation to find IDs that don't match up. Anything that doesn't match will be represented
  // as ID-less function calls.
  const unmatchedFunctionCallIds = getUnmatchedFunctionIds(conversationMessages);

  const messages = await Promise.all(
    conversationMessages.map(async (message): Promise<OpenAIClient.Chat.ChatCompletionMessageParam> => {
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
          };
        case 'assistant':
          return {
            role: 'assistant',
            content: await render(message.element),
          };
        case 'functionCall':
          if (message.element.props.id && !unmatchedFunctionCallIds.has(message.element.props.id)) {
            // N.B. Adjacent tool calls will be coalesced below.
            return {
              role: 'assistant',
              content: '',
              tool_calls: [
                {
                  type: 'function',
                  function: { name: message.element.props.name, arguments: JSON.stringify(message.element.props.args) },
                  id: message.element.props.id,
                },
              ],
            };
          }

          return {
            role: 'assistant',
            content: '',
            function_call: {
              name: message.element.props.name,
              arguments: JSON.stringify(message.element.props.args),
            },
          };
        case 'functionResponse':
          if (message.element.props.id && !unmatchedFunctionCallIds.has(message.element.props.id)) {
            return {
              role: 'tool',
              tool_call_id: message.element.props.id,
              content: await render(message.element.props.children),
            };
          }

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

  const mergedMessages = coalesceToolCallMessages(messages);

  const openaiTools = !props.functionDefinitions
    ? []
    : Object.entries(props.functionDefinitions).map<OpenAIClient.Chat.ChatCompletionTool>(
        ([functionName, functionDefinition]) => ({
          function: {
            name: functionName,
            description: functionDefinition.description,
            parameters: getParametersSchema(functionDefinition.parameters),
          },
          type: 'function',
        })
      );

  const openai = getContext(openAiClientContext)();
  const chatCompletionRequest: OpenAIClient.Chat.Completions.ChatCompletionCreateParamsStreaming = {
    model: props.model,
    max_tokens: props.maxTokens,
    temperature: props.temperature,
    top_p: props.topP,
    messages: mergedMessages,
    tools: openaiTools.length > 0 ? openaiTools : undefined,
    tool_choice: props.forcedFunction
      ? { function: { name: props.forcedFunction }, type: 'function' as const }
      : undefined,
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
  let finishReason: string | undefined = undefined;
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
    // Eat any empty chunks, typically seen at the beginning of the stream.
    let next;
    do {
      next = await iterator.next();
      if (next.done) {
        return null;
      }
    } while (next.value.choices.length == 0);

    logger.trace({ deltaMessage: next.value }, 'Got delta message');

    if (next.value.choices[0].finish_reason) {
      finishReason = next.value.choices[0].finish_reason;
    }
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
          if (delta.tool_calls) {
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
    while (delta?.tool_calls) {
      // Memoize the stream to ensure it renders only once.
      const functionCallStream = memo(
        (async function* () {
          let id = undefined;
          let name = '';
          let argsJson = '';
          while (delta != null) {
            if (!delta.tool_calls) {
              break;
            }

            const toolCall = delta.tool_calls[0];
            if (toolCall.id) {
              if (id === undefined) {
                id = toolCall.id;
              } else if (id !== toolCall.id) {
                // The ID changed, so we're done with this function call.
                break;
              }
            }

            if (toolCall.function?.name) {
              name += toolCall.function.name;
            }

            if (toolCall.function?.arguments) {
              argsJson += toolCall.function.arguments;
            }

            try {
              yield (
                <FunctionCall id={id} partial name={name} args={JSON.parse(patchedUntruncateJson(argsJson || '{}'))} />
              );
            } catch (e: any) {
              // If the JSON is incomplete and we get an error, we can ignore it.
              if (!('Unexpected string in JSON' in e.message || 'Unexpected end of JSON input' in e.message)) {
                throw e;
              }
            }

            delta = await advance();
          }

          return <FunctionCall id={id} name={name} args={JSON.parse(argsJson || '{}')} />;
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

  // TS doesn't realize that the advance closure can set `finishReason`.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (finishReason) {
    logger.setAttribute('openai.finish_reason', finishReason);
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
