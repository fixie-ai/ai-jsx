import { openAIChat } from '../lib/models.ts';
import { LLMx, Models } from '../lib/index.ts';
import { ChatCompletionRequestMessage } from 'openai';

export async function* Completion(
  props: {
    temperature?: number;
    maxTokens?: number;
    stop?: string[];
    children: LLMx.Node;
  },
  { render }: LLMx.RenderContext
) {
  yield '▁';
  let prompt = await render(props.children);
  while (prompt.length > 0 && prompt.endsWith(' ')) {
    prompt = prompt.slice(0, prompt.length - 1);
  }

  const tokenStream = Models.openAICompletion.simpleStream({
    model: 'text-davinci-003',
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

export function SystemMessage({ children }: { children: LLMx.Node }) {
  return children;
}
export function UserMessage({ children }: { name?: string; children: LLMx.Node }) {
  return children;
}
export function AssistantMessage({ children }: { children: LLMx.Node }) {
  return children;
}

export async function* ChatCompletion(
  props: {
    temperature?: number;
    maxTokens?: number;
    stop?: string[];
    children: LLMx.Node;
  },
  { render, partialRender }: LLMx.RenderContext
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
            name: (message.props as LLMx.PropsOfComponent<typeof UserMessage>).name,
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
    model: 'gpt-3.5-turbo',
    max_tokens: props.maxTokens,
    temperature: props.temperature,
    messages,
    stop: props.stop,
  });

  let lastMessage;
  for await (const partialMessage of messageStream) {
    lastMessage = partialMessage.content;
    yield `${partialMessage.content}█`;
  }

  yield lastMessage;
}
