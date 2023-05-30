import { openAIChat } from '../lib/models';
import { LLMx, Models, log } from '../lib';
import { createElementArgs } from './llm';
import { ChatCompletionRequestMessageRoleEnum } from 'openai';

export async function* Completion(
  props: { temperature?: number; maxTokens?: number; stop?: string[] },
  children: LLMx.Node[]
) {
  yield '▁';
  let prompt = await LLMx.render(children);
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

export function SystemMessage(props: any, children: LLMx.Node[]) {
  return children;
}
export function UserMessage(props: any, children: LLMx.Node[]) {
  return children;
}
export function AssistantMessage(props: any, children: LLMx.Node[]) {
  return children;
}

type ChatPart = typeof SystemMessage | typeof UserMessage | typeof AssistantMessage;

export async function* ChatCompletion(
  props: { temperature?: number; maxTokens?: number; stop?: string[] },
  children: ChatPart[]
) {
  yield '▁';

  const chatMessagesOfChildren = await Promise.all(
    children.map(async (child) => {
      // The validation here will throw an error for fragments, which is not necessarily what we want –
      // the fragment could contain the proper children.

      // Not bothering to fix the types here because we may rip this out.
      // @ts-expect-error
      const childComponent = child[createElementArgs];
      if (!childComponent) {
        throw new Error(
          `ChatCompletion's child components must be SystemMessage, UserMessage, or AssistantMessage, but this child was ${child}`
        );
      }
      const childComponentFn = childComponent[0];
      let childType: ChatCompletionRequestMessageRoleEnum;
      switch (childComponentFn) {
        case SystemMessage:
          childType = 'system';
          break;
        case UserMessage:
          childType = 'user';
          break;
        case AssistantMessage:
          childType = 'assistant';
          break;
        default:
          throw new Error(
            `ChatCompletion's child components must be SystemMessage, UserMessage, or AssistantMessage, but this child was ${child}`
          );
      }

      // Not bothering to fix the types here because we may rip this out.
      // @ts-expect-error
      const renderResult = await LLMx.render(child());
      log.trace({ renderResult, childType }, 'ChatCompletion child render result');
      return {
        role: childType,
        content: renderResult,
      };
    })
  );

  const messageStream = openAIChat.simpleStream({
    model: 'gpt-3.5-turbo',
    max_tokens: props.maxTokens,
    temperature: props.temperature,
    messages: chatMessagesOfChildren,
    stop: props.stop,
  });

  let lastMessage;
  for await (const partialMessage of messageStream) {
    lastMessage = partialMessage.content;
    yield `${partialMessage.content}█`;
  }

  yield lastMessage;
}
