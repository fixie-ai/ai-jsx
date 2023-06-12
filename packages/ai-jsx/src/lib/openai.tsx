import {
  AssistantMessage,
  ChatProvider,
  CompletionProvider,
  ModelProps,
  ModelPropsWithChildren,
  SystemMessage,
  UserMessage,
} from '../core/completion.js';
import {
  ChatCompletionRequestMessage,
  ChatCompletionResponseMessage,
  Configuration,
  CreateChatCompletionResponse,
  CreateCompletionResponse,
  OpenAIApi,
} from 'openai';
import * as LLMx from '../index.js';
import { PropsOfComponent, Node } from '../index.js';
import GPT3Tokenizer from 'gpt3-tokenizer';
import { Merge } from 'type-fest';

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

const openAiClientContext = LLMx.createContext<OpenAIApi>(
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
async function* openAiEventsToJson<T>(iterable: AsyncIterable<Buffer>): AsyncGenerator<T> {
  const SSE_PREFIX = 'data: ';
  const SSE_TERMINATOR = '\n\n';
  const SSE_FINAL_EVENT = '[DONE]';

  let bufferedContent = '';

  for await (const chunk of iterable) {
    const textToParse = bufferedContent + chunk.toString('utf8');
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
  // @ts-expect-error
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

  const completionResponse = await openai.createCompletion(completionRequest, {
    responseType: 'stream',
    validateStatus: () => true,
  });

  if (completionResponse.status < 200 || completionResponse.status >= 300) {
    const responseData = [] as string[];
    for await (const body of completionResponse.data as unknown as AsyncIterable<Buffer>) {
      responseData.push(body.toString('utf8'));
    }
    logger.error(
      { statusCode: completionResponse.status, responseBody: responseData.join('') },
      'createCompletion failed'
    );
    throw new Error(`OpenAI request failed with status code ${completionResponse.status}`);
  } else {
    logger.debug({ statusCode: completionResponse.status }, 'createCompletion succeeded');
  }

  let resultSoFar = '';

  for await (const event of openAiEventsToJson<CreateCompletionResponse>(
    completionResponse.data as unknown as AsyncIterable<Buffer>
  )) {
    logger.trace({ event }, 'Got createCompletion event');
    resultSoFar += event.choices[0].text;
    yield resultSoFar;
  }

  logger.debug({ completion: resultSoFar }, 'Finished createCompletion');

  return resultSoFar;
}

export async function* OpenAIChatModel(
  props: ModelPropsWithChildren & { model: ValidChatModel; logitBias?: Record<string, number> },
  { render, getContext, logger }: LLMx.ComponentContext
) {
  const messageElements = await render(props.children, {
    stop: (e) => e.tag == SystemMessage || e.tag == UserMessage || e.tag == AssistantMessage,
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
        default:
          throw new Error(
            `ChatCompletion's prompts must be SystemMessage, UserMessage, or AssistantMessage, but this child was ${message.tag.name}`
          );
      }
    })
  );

  const openai = getContext(openAiClientContext);
  const chatCompletionRequest = {
    model: props.model,
    max_tokens: props.maxTokens,
    temperature: props.temperature,
    messages,
    stop: props.stop,
    logit_bias: props.logitBias ? logitBiasOfTokens(props.logitBias) : undefined,
    stream: true,
  };

  logger.debug({ chatCompletionRequest }, 'Calling createChatCompletion');
  const chatResponse = await openai.createChatCompletion(chatCompletionRequest, {
    responseType: 'stream',
    validateStatus: () => true,
  });

  if (chatResponse.status < 200 || chatResponse.status >= 300) {
    const responseData = [] as string[];
    for await (const body of chatResponse.data as unknown as AsyncIterable<Buffer>) {
      responseData.push(body.toString('utf8'));
    }
    logger.error(
      { statusCode: chatResponse.status, responseBody: responseData.join('') },
      'createChatCompletion failed'
    );
    throw new Error(`OpenAI request failed with status code ${chatResponse.status}`);
  } else {
    logger.debug({ statusCode: chatResponse.status }, 'createChatCompletion succeeded');
  }

  type ChatCompletionDelta = Merge<
    CreateChatCompletionResponse,
    {
      choices: { delta: Partial<ChatCompletionResponseMessage> }[];
    }
  >;

  const currentMessage = { content: '' } as Partial<ChatCompletionResponseMessage>;
  for await (const deltaMessage of openAiEventsToJson<ChatCompletionDelta>(
    chatResponse.data as unknown as AsyncIterable<Buffer>
  )) {
    logger.trace({ deltaMessage }, 'Got delta message');
    const delta = deltaMessage.choices[0].delta;
    if (delta.role) {
      currentMessage.role = deltaMessage.choices[0].delta.role;
    }
    if (delta.content) {
      currentMessage.content += delta.content;
      yield currentMessage.content;
    }
  }

  logger.debug({ message: currentMessage }, 'Finished createChatCompletion');

  return currentMessage.content;
}
