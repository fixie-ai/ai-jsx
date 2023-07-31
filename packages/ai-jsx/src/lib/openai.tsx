/**
 * This module provides interfaces to OpenAI's various models.
 * @packageDocumentation
 */

import GPT3Tokenizer from 'gpt3-tokenizer';
import {
  ChatCompletionFunctions,
  ChatCompletionRequestMessage,
  ChatCompletionResponseMessage,
  Configuration,
  CreateChatCompletionRequestFunctionCall,
  CreateChatCompletionResponse,
  CreateCompletionResponse,
  CreateImageRequestResponseFormatEnum,
  CreateImageRequestSizeEnum,
  OpenAIApi,
  ResponseTypes,
} from 'openai-edge';
import { Merge, MergeExclusive } from 'type-fest';
import {
  AssistantMessage,
  ChatProvider,
  CompletionProvider,
  FunctionCall,
  FunctionDefinition,
  FunctionResponse,
  ModelProps,
  ModelPropsWithChildren,
  SystemMessage,
  UserMessage,
  getParametersSchema,
} from '../core/completion.js';
import { AIJSXError, ErrorCode, HttpError } from '../core/errors.js';
import { Image, ImageGenPropsWithChildren } from '../core/image-gen.js';
import { Logger } from '../core/log.js';
import * as AI from '../index.js';
import { Node, PropsOfComponent } from '../index.js';
import { ChatOrCompletionModelOrBoth } from './model.js';
import { getEnvVar, patchedUntruncateJson } from './util.js';
import { CreateChatCompletionRequest } from 'openai';

// https://platform.openai.com/docs/models/model-endpoint-compatibility
type ValidCompletionModel =
  | 'text-davinci-003'
  | 'text-davinci-002'
  | 'text-curie-001'
  | 'text-babbage-001'
  | 'text-ada-001';

type ValidChatModel =
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

type OpenAIModelChoices = ChatOrCompletionModelOrBoth<ValidChatModel, ValidCompletionModel>;

const decoder = new TextDecoder();

export const openAiClientContext = AI.createContext<OpenAIApi>(
  new OpenAIApi(
    new Configuration({
      apiKey: getEnvVar('OPENAI_API_KEY', false),
    }),
    // We actually want the nullish coalescing behavior in this case,
    // because if the env var is '', we want to pass `undefined` instead.
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    getEnvVar('OPENAI_API_BASE', false) || undefined,
    // TODO: Figure out a better way to work around NextJS fetch blocking streaming
    (globalThis as any)._nextOriginalFetch ?? globalThis.fetch
  )
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
}: { children: Node; client?: OpenAIApi } & OpenAIModelChoices & ModelProps) {
  let result = children;

  if (client) {
    result = <openAiClientContext.Provider value={client}>{children}</openAiClientContext.Provider>;
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

/**
 * Parses an OpenAI SSE response stream according to:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
 *  - https://github.com/openai/openai-cookbook/blob/970d8261fbf6206718fe205e88e37f4745f9cf76/examples/How_to_stream_completions.ipynb
 * @param iterable A byte stream from an OpenAI SSE response.
 * @returns An async generator that yields the parsed JSON objects from the stream.
 */
async function* openAiEventsToJson<T>(iterable: AsyncIterable<String>): AsyncGenerator<T> {
  const SSE_PREFIX = 'data: ';
  const SSE_TERMINATOR = '\n\n';
  const SSE_FINAL_EVENT = '[DONE]';

  let bufferedContent = '';

  for await (const chunk of iterable) {
    const textToParse = bufferedContent + chunk;
    const eventsWithExtra = textToParse.split(SSE_TERMINATOR);

    // Any content not terminated by a "\n\n" will be buffered for the next chunk.
    const events = eventsWithExtra.slice(0, -1);
    bufferedContent = eventsWithExtra[eventsWithExtra.length - 1] ?? '';

    for (const event of events) {
      if (!event.startsWith(SSE_PREFIX)) {
        continue;
      }
      const text = event.slice(SSE_PREFIX.length);
      if (text === SSE_FINAL_EVENT) {
        continue;
      }

      yield JSON.parse(text) as T;
    }
  }
}

function logitBiasOfTokens(tokens: Record<string, number>) {
  // N.B. We're using GPT3Tokenizer which per https://platform.openai.com/tokenizer "works for most GPT-3 models".
  const tokenizer = new GPT3Tokenizer.default({ type: 'gpt3' });
  return Object.fromEntries(
    Object.entries(tokens).map(([token, bias]) => {
      const encoded = tokenizer.encode(token) as { bpe: number[]; text: string[] };
      if (encoded.bpe.length > 1) {
        throw new AIJSXError(
          `You can only set logit_bias for a single token, but "${bias}" is ${encoded.bpe.length} tokens.`,
          ErrorCode.LogitBiasBadInput,
          'user'
        );
      }
      return [encoded.bpe[0], bias];
    })
  );
}

/**
 * Returns true if the given model supports function calling.
 * @param model The model to check.
 * @returns True if the model supports function calling, false otherwise.
 */
function chatModelSupportsFunctions(model: ValidChatModel) {
  return [
    'gpt-4',
    'gpt-3.5-turbo',
    'gpt-4-0613',
    'gpt-4-32k-0613',
    'gpt-3.5-turbo-0613',
    'gpt-3.5-turbo-16k',
    'gpt-3.5-turbo-16k-0613',
  ].includes(model);
}

type OpenAIMethod = 'createCompletion' | 'createChatCompletion' | 'createImage';

/**
 * Represents an error that occurs when making an OpenAI API call.
 */
export class OpenAIError<M extends OpenAIMethod> extends HttpError {
  readonly errorResponse: Record<string, any> | null;

  constructor(response: Response, method: M, responseText: string, errorCode: number) {
    let errorResponse = null as Record<string, any> | null;
    let responseSuffix = '';
    try {
      errorResponse = JSON.parse(responseText);
    } catch {
      // The response wasn't JSON, ignore it.
    }

    const parsedMessage = errorResponse?.error?.message;
    if (typeof parsedMessage === 'string' && parsedMessage.trim().length > 0) {
      responseSuffix = `: ${parsedMessage}`;
    }

    super(
      `OpenAI ${method} request failed with status code ${response.status}${responseSuffix}\n\nFor more information, see https://platform.openai.com/docs/guides/error-codes/api-errors`,
      response.status,
      errorCode,
      responseText,
      Object.fromEntries(response.headers.entries())
    );
    this.errorResponse = errorResponse;
  }
}

async function* asyncIteratorOfFetchStream(reader: ReturnType<NonNullable<Response['body']>['getReader']>) {
  while (true) {
    const { done, value } =
      // I don't know why the types fail here, but the code works.
      // @ts-expect-error
      await reader.read();
    if (done) {
      return;
    }
    yield decoder.decode(value);
  }
}

async function checkOpenAIResponse<M extends OpenAIMethod>(response: Response, logger: Logger, method: M) {
  if (response.status < 200 || response.status >= 300 || !response.body) {
    throw new OpenAIError(response, method, await response.text(), 1023);
  } else {
    logger.debug({ statusCode: response.status, headers: response.headers }, `${method} succeeded`);
  }
}

let iteration = 0;

/**
 * Represents an OpenAI text completion model (e.g., `text-davinci-003`).
 */
export async function* OpenAICompletionModel(
  props: ModelPropsWithChildren & { model: ValidCompletionModel; logitBias?: Record<string, number> },
  { render, getContext, logger }: AI.ComponentContext
): AI.RenderableStream {
  yield AI.AppendOnlyStream;

  const openai = getContext(openAiClientContext);
  const completionRequest = {
    model: props.model,
    max_tokens: props.maxTokens,
    temperature: props.temperature,
    top_p: props.topP,
    prompt: await render(props.children),
    stop: props.stop,
    stream: true,
    logit_bias: props.logitBias ? logitBiasOfTokens(props.logitBias) : undefined,
  };
  logger.debug({ completionRequest }, 'Calling createCompletion');

  const completionResponse = await openai.createCompletion(completionRequest);

  await checkOpenAIResponse(completionResponse, logger, 'createCompletion');

  let resultSoFar = '';

  // checkOpenAIResponse will throw if completionResponse.body is null, so we know it's not null here.
  const responseIterator = asyncIteratorOfFetchStream(completionResponse.body!.getReader());

  for await (const event of openAiEventsToJson<CreateCompletionResponse>(responseIterator)) {
    logger.trace({ event }, 'Got createCompletion event');
    yield event.choices[0].text;
    resultSoFar += event.choices[0].text;
  }

  logger.debug({ completion: resultSoFar }, 'Finished createCompletion');

  return AI.AppendOnlyStream;
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

  const messageElements = await render(props.children, {
    stop: (e) =>
      e.tag == SystemMessage ||
      e.tag == UserMessage ||
      e.tag == AssistantMessage ||
      e.tag == FunctionCall ||
      e.tag == FunctionResponse,
  });

  const messages: ChatCompletionRequestMessage[] = await Promise.all(
    messageElements.filter(AI.isElement).map(async (message) => {
      switch (message.tag) {
        case SystemMessage:
          return {
            role: 'system',
            content: await render(message),
          };
        case UserMessage:
          return {
            role: 'user',
            content: await render(message),
            name: (message.props as PropsOfComponent<typeof UserMessage>).name,
          };
        case AssistantMessage:
          return {
            role: 'assistant',
            content: await render(message),
          };
        case FunctionCall:
          return {
            role: 'assistant',
            content: '',
            function_call: {
              name: message.props.name,
              arguments: JSON.stringify(message.props.args),
            },
          };
        case FunctionResponse:
          return {
            role: 'function',
            name: message.props.name,
            content: await render(message.props.children),
          };
        default:
          throw new AIJSXError(
            `ChatCompletion's prompts must be SystemMessage, UserMessage, AssistantMessage, FunctionCall, or FunctionResponse but this child was ${message.tag.name}`,
            ErrorCode.ChatCompletionUnexpectedChild,
            'internal'
          );
      }
    })
  );

  if (!messages.length) {
    throw new AIJSXError(
      "ChatCompletion must have at least child that's a SystemMessage, UserMessage, AssistantMessage, FunctionCall, or FunctionResponse, but no such children were found.",
      ErrorCode.ChatCompletionMissingChildren,
      'user'
    );
  }

  const openaiFunctions: ChatCompletionFunctions[] | undefined = !props.functionDefinitions
    ? undefined
    : Object.entries(props.functionDefinitions).map(([functionName, functionDefinition]) => ({
        name: functionName,
        description: functionDefinition.description,
        parameters: getParametersSchema(functionDefinition.parameters),
      }));
  const openaiFunctionCall: CreateChatCompletionRequestFunctionCall | undefined = props.forcedFunction
    ? { name: props.forcedFunction }
    : undefined;

  const openai = getContext(openAiClientContext);
  const chatCompletionRequest: CreateChatCompletionRequest = {
    model: props.model,
    max_tokens: props.maxTokens,
    temperature: props.temperature,
    top_p: props.topP,
    messages,
    functions: openaiFunctions,
    function_call: openaiFunctionCall,
    stop: props.stop,
    logit_bias: props.logitBias ? logitBiasOfTokens(props.logitBias) : undefined,
    stream: true,
  };

  function sleep() {
    // return new Promise(resolve => setTimeout(resolve, 500));

    // return new Promise<void>((resolve) => {
    //   console.log('timeout start');
    //   setTimeout(() => {
    //     console.log('timeout done');
    //     resolve();
    //   }, 1000);
    // })

    return Promise.resolve();
  }
  // iteration++;
  // await sleep();
  // yield `first ${iteration} `
  // await sleep();
  // yield `second ${iteration} `
  // await sleep();
  // yield `third ${iteration}`
  // return AI.AppendOnlyStream;

  logger.debug({ chatCompletionRequest }, 'Calling createChatCompletion');
  const chatResponse = await openai.createChatCompletion(chatCompletionRequest);

  await checkOpenAIResponse(chatResponse, logger, 'createChatCompletion');

  type ChatCompletionDelta = Merge<
    CreateChatCompletionResponse,
    {
      choices: { delta: Partial<ChatCompletionResponseMessage>; finish_reason: string | undefined }[];
    }
  >;

  const iterator = openAiEventsToJson<ChatCompletionDelta>(asyncIteratorOfFetchStream(chatResponse.body!.getReader()))[
    Symbol.asyncIterator
  ]();

  // We have a single response iterator, but we'll wrap tokens _within_ the structure of <AssistantMessage> or <FunctionCall>
  // components. This:
  //  - Allows our stream to be append-only and therefore eagerly rendered in append-only contexts.
  //  - Preserves the output structure to allow callers to extract/separate <AssistantMessage> and <FunctionCall> messages.
  //  - Allows the intermediate states of the stream to include "partial" <FunctionCall> elements with healed JSON.
  //
  // This requires some gymnastics because several components will share a single iterator that can only be consumed once.
  // That is, the logical loop execution is spread over multiple functions (closures over the shared iterator).
  async function advance(): Promise<Partial<ChatCompletionResponseMessage> | null> {
    const next = await iterator.next();
    if (next.done) {
      return null;
    }

    logger.trace({ deltaMessage: next.value }, 'Got delta message');
    return next.value.choices[0].delta;
  }

  let delta = await advance();
  while (delta !== null) {
    // @ts-ignore
    if (delta.role === 'assistant') {
      // Memoize the stream to ensure it renders only once.
      const assistantStream = memo(
        (async function* (): AI.RenderableStream {
          yield AI.AppendOnlyStream;

          while (delta !== null) {
            if (delta.content) {
              yield delta.content;
            }
            if (delta.function_call) {
              break;
            }
            delta = await advance();
          }

          return AI.AppendOnlyStream;
        })()
      );
      yield <AssistantMessage>{assistantStream}</AssistantMessage>;

      // Ensure the assistantStream is flushed by rendering it.
      await render(assistantStream);
    }

    // TS doesn't realize that the assistantStream closure can make `delta` be `null`.
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
    }

    // TS doesn't realize that the functionCallStream closure can make `delta` be `null`.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (delta !== null) {
      delta = await advance();
    }
  }

  logger.debug('Finished createChatCompletion');

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
  let sizeEnum;
  switch (size) {
    case '256x256':
      sizeEnum = CreateImageRequestSizeEnum._256x256;
      break;
    case '512x512':
      sizeEnum = CreateImageRequestSizeEnum._512x512;
      break;
    case '1024x1024':
      sizeEnum = CreateImageRequestSizeEnum._1024x1024;
      break;
    default:
      throw new AIJSXError(
        `Invalid size ${size}. Dalle only supports 256x256, 512x512, and 1024x1024`,
        ErrorCode.ImageBadDimensions,
        'user'
      );
  }

  // Consider emitting http://via.placeholder.com/256x256 instead.
  yield (
    <Image
      url={`http://via.placeholder.com/${size}`}
      prompt="placeholder while real results renderes"
      modelName="placeholder.com"
    />
  );

  const prompt = await render(children);

  const openai = getContext(openAiClientContext);

  const imageRequest = {
    prompt,
    n: numSamples,
    size: sizeEnum,
    response_format: CreateImageRequestResponseFormatEnum.Url,
  };

  logger.debug({ imageRequest }, 'Calling createImage');

  const response = await openai.createImage(imageRequest);

  if (response.status < 200 || response.status >= 300) {
    throw new OpenAIError(response, 'createImage', await response.text(), 1024);
  } else {
    logger.debug({ statusCode: response.status, headers: response.headers }, 'createImage succeeded');
  }

  // return all image URLs as {@link Image} components.
  const responseJson = (await response.json()) as ResponseTypes['createImage'];
  return responseJson.data.flatMap((image) =>
    image.url ? [<Image url={image.url} prompt={prompt} modelName="Dalle" />] : []
  );
}
