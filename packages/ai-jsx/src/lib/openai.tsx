import {
  AssistantMessage,
  ChatProvider,
  CompletionProvider,
  ModelProps,
  ModelPropsWithChildren,
  SystemMessage,
  UserMessage,
  FunctionDefinition,
  FunctionCall,
  FunctionResponse,
} from '../core/completion.js';
import { ImageGenPropsWithChildren } from '../core/image-gen.js';
// openai-edge hasn't updated its types to support the new function types yet,
// so we'll import the types from openai until it does.
import { ChatCompletionFunctions, ChatCompletionResponseMessage, ChatCompletionRequestMessage } from 'openai';
import {
  Configuration,
  CreateChatCompletionResponse,
  CreateCompletionResponse,
  OpenAIApi,
  CreateImageRequestSizeEnum,
  CreateImageRequestResponseFormatEnum,
  ResponseTypes,
} from '@nick.heiner/openai-edge';
import * as LLMx from '../index.js';
import { PropsOfComponent, Node } from '../index.js';
import GPT3Tokenizer from 'gpt3-tokenizer';
import { Merge } from 'type-fest';
import { Logger } from '../core/log.js';
import { HttpError } from '../core/errors.js';
import _ from 'lodash';

// https://platform.openai.com/docs/models/model-endpoint-compatibility
type ValidCompletionModel =
  | 'text-davinci-003'
  | 'text-davinci-002'
  | 'text-curie-001'
  | 'text-babbage-001'
  | 'text-ada-001';

type ValidChatModel = 'gpt-4' | 'gpt-4-0314' | 'gpt-4-32k' | 'gpt-4-32k-0314' | 'gpt-3.5-turbo' | 'gpt-3.5-turbo-0301';

type ChatOrCompletionModelOrBoth =
  | { chatModel: ValidChatModel; completionModel?: ValidCompletionModel }
  | { chatModel?: ValidChatModel; completionModel: ValidCompletionModel };

const decoder = new TextDecoder();

export const openAiClientContext = LLMx.createContext<OpenAIApi>(
  new OpenAIApi(
    new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    })
  )
);

export function OpenAI({
  children,
  chatModel,
  completionModel,
  client,
  ...defaults
}: { children: Node; client?: OpenAIApi } & ChatOrCompletionModelOrBoth & ModelProps) {
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
        throw new Error(
          `You can only set logit_bias for a single token, but "${bias}" is ${encoded.bpe.length} tokens.`
        );
      }
      return [encoded.bpe[0], bias];
    })
  );
}

type OpenAIMethod = 'createCompletion' | 'createChatCompletion' | 'createImage';

export class OpenAIError<M extends OpenAIMethod> extends HttpError {
  readonly errorResponse: Record<string, any> | null;

  constructor(response: Response, method: M, responseText: string) {
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
    throw new OpenAIError(response, method, await response.text());
  } else {
    logger.debug({ statusCode: response.status, headers: response.headers }, `${method} succeeded`);
  }
}

export async function* OpenAICompletionModel(
  props: ModelPropsWithChildren & { model: ValidCompletionModel; logitBias?: Record<string, number> },
  { render, getContext, logger }: LLMx.ComponentContext
) {
  yield '';

  const openai = getContext(openAiClientContext);
  const completionRequest = {
    model: props.model,
    max_tokens: props.maxTokens,
    temperature: props.temperature,
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
    resultSoFar += event.choices[0].text;
    yield resultSoFar;
  }

  logger.debug({ completion: resultSoFar }, 'Finished createCompletion');

  return resultSoFar;
}

export async function* OpenAIChatModel(
  props: ModelPropsWithChildren & {
    model: ValidChatModel;
    logitBias?: Record<string, number>;
    functionDefinitions?: FunctionDefinition[];
  },
  { render, getContext, logger }: LLMx.ComponentContext
) {
  const messageElements = await render(props.children, {
    stop: (e) =>
      e.tag == SystemMessage ||
      e.tag == UserMessage ||
      e.tag == AssistantMessage ||
      e.tag == FunctionCall ||
      e.tag == FunctionResponse,
  });
  yield '';
  const messages: ChatCompletionRequestMessage[] = await Promise.all(
    messageElements.filter(LLMx.isElement).map(async (message) => {
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
          throw new Error(
            `ChatCompletion's prompts must be SystemMessage, UserMessage, or AssistantMessage, but this child was ${message.tag.name}`
          );
      }
    })
  );

  const openaiFunctions: ChatCompletionFunctions[] | undefined = props.functionDefinitions?.map(
    (functionDefinition) => ({
      name: functionDefinition.name,
      description: functionDefinition.description,
      parameters: {
        type: 'object',
        required: Object.keys(functionDefinition.parameters).filter(
          (name) => functionDefinition.parameters[name].required
        ),
        properties: Object.keys(functionDefinition.parameters).reduce(
          (map: Record<string, any>, paramName) => ({
            ...map,
            [paramName]: {
              type: functionDefinition.parameters[paramName].type,
            },
          }),
          {}
        ),
      },
    })
  );

  const openai = getContext(openAiClientContext);
  const chatCompletionRequest = {
    model: props.model,
    max_tokens: props.maxTokens,
    temperature: props.temperature,
    messages,
    functions: openaiFunctions,
    stop: props.stop,
    logit_bias: props.logitBias ? logitBiasOfTokens(props.logitBias) : undefined,
    stream: true,
  };

  logger.debug({ chatCompletionRequest }, 'Calling createChatCompletion');
  const chatResponse = await openai.createChatCompletion(
    // We can remove this once openai-edge updates to reflect the new chat function types.
    // @ts-expect-error
    chatCompletionRequest
  );

  await checkOpenAIResponse(chatResponse, logger, 'createChatCompletion');

  type ChatCompletionDelta = Merge<
    CreateChatCompletionResponse,
    {
      choices: { delta: Partial<ChatCompletionResponseMessage>; finish_reason: string | undefined }[];
    }
  >;

  const currentMessage = { content: undefined, function_call: undefined } as Partial<ChatCompletionResponseMessage>;
  let finishReason: string | undefined = undefined;
  for await (const deltaMessage of openAiEventsToJson<ChatCompletionDelta>(
    asyncIteratorOfFetchStream(chatResponse.body!.getReader())
  )) {
    logger.trace({ deltaMessage }, 'Got delta message');
    finishReason = finishReason ?? deltaMessage.choices[0].finish_reason;
    const delta = deltaMessage.choices[0].delta;
    if (delta.role) {
      currentMessage.role = deltaMessage.choices[0].delta.role;
    }
    if (delta.content) {
      currentMessage.content = currentMessage.content ?? '';
      currentMessage.content += delta.content;
      yield currentMessage.content;
    }
    if (delta.function_call) {
      currentMessage.function_call = currentMessage.function_call ?? { name: '', arguments: '' };
      if (delta.function_call.name) {
        currentMessage.function_call.name += delta.function_call.name;
      }
      if (delta.function_call.arguments) {
        currentMessage.function_call.arguments += delta.function_call.arguments;
      }
    }
  }

  logger.debug({ message: currentMessage }, 'Finished createChatCompletion');

  if (currentMessage.function_call) {
    return (
      <FunctionCall
        name={currentMessage.function_call.name ?? ''}
        args={JSON.parse(currentMessage.function_call.arguments ?? '{}')}
      />
    );
  }
  return currentMessage.content ?? '';
}

/**
 * Generates an image from a prompt using the DALL-E model.
 * @see https://platform.openai.com/docs/guides/images/introduction
 *
 * @returns the URL of the generated image.
 *          If numSamples is greater than 1, URLs are separated by newlines.
 */
export async function DalleImageGen(
  { numSamples = 1, size = '512x512', children }: ImageGenPropsWithChildren,
  { render, getContext, logger }: LLMx.ComponentContext
) {
  const prompt = await render(children);

  const openai = getContext(openAiClientContext);

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
      throw new Error(`Invalid size ${size}. Dalle only supports 256x256, 512x512, and 1024x1024`);
  }

  const imageRequest = {
    prompt,
    n: numSamples,
    size: sizeEnum,
    response_format: CreateImageRequestResponseFormatEnum.Url,
  };

  logger.debug({ imageRequest }, 'Calling createImage');

  const response = await openai.createImage(imageRequest);

  if (response.status < 200 || response.status >= 300) {
    throw new OpenAIError(response, 'createImage', await response.text());
  } else {
    logger.debug({ statusCode: response.status, headers: response.headers }, 'createImage succeeded');
  }

  // return all image URLs as a newline-separated string
  const responseJson = (await response.json()) as ResponseTypes['createImage'];
  return _.map(responseJson.data, 'url').join('\n');
}
