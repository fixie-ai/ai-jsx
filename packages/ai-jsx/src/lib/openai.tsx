import { ChatCompletionRequestMessage } from 'openai';
import {
  AssistantMessage,
  ChatProvider,
  CompletionProvider,
  ModelProps,
  ModelPropsWithChildren,
  SystemMessage,
  UserMessage,
} from '../core/completion';
import * as LLMx from '../lib/llm';
import { RenderContext, PropsOfComponent, Node } from '../lib/llm';
import { openAIChat, openAICompletion } from '../core/models';
import GPT3Tokenizer from 'gpt3-tokenizer';
// const GPT3Tokenizer = require('gpt3-tokenizer') as typeof import('gpt3-tokenizer');

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

export function OpenAI({
  children,
  chatModel,
  completionModel,
  ...defaults
}: { children: Node } & ChatOrCompletionModelOrBoth & ModelProps) {
  let result = children;

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

export async function* OpenAICompletionModel(
  props: ModelPropsWithChildren & { model: ValidCompletionModel },
  { render }: RenderContext
) {
  yield '▁';
  let prompt = await render(props.children);
  while (prompt.length > 0 && prompt.endsWith(' ')) {
    prompt = prompt.slice(0, prompt.length - 1);
  }

  const tokenStream = openAICompletion.simpleStream({
    model: props.model as any,
    max_tokens: props.maxTokens,
    temperature: props.temperature,
    prompt,
    stop: props.stop,
  });

  let accumulatedResponse = '';
  for await (const token of tokenStream) {
    accumulatedResponse += token;
    yield `${accumulatedResponse}█`;
  }

  yield accumulatedResponse;
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

export async function* OpenAIChatModel(
  props: ModelPropsWithChildren & { model: ValidChatModel; logitBias?: Record<string, number> },
  { render, partialRender }: RenderContext
) {
  yield '▁';

  const messageElements = await partialRender(
    props.children,
    (e) => e.tag == SystemMessage || e.tag == UserMessage || e.tag == AssistantMessage
  );

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

  const messageStream = openAIChat.simpleStream({
    model: props.model,
    max_tokens: props.maxTokens,
    temperature: props.temperature,
    messages,
    stop: props.stop,
    logit_bias: props.logitBias ? logitBiasOfTokens(props.logitBias) : undefined,
  });

  let lastMessage;
  for await (const partialMessage of messageStream) {
    lastMessage = partialMessage.content;
    yield `${partialMessage.content}█`;
  }

  yield lastMessage;
}
