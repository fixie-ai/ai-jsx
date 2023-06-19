/** @jsxImportSource ai-jsx/react */
/* eslint-disable react/jsx-key */
import { AssistantMessage, ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';

export function ChatAgent({ conversation }: { conversation: string[] }) {
  console.log('conversation: ' + conversation);
  return (
    <ChatCompletion>
      <SystemMessage>
        You are a web developer who is passionate about HTML, CSS, and JS/JSX. You think that other languages are fine,
        but Javascript is the true language of the people. When someone is talking to you, always try to steer the
        conversation back to these topics that you care so deeply about.
      </SystemMessage>
      {conversation.map((message, index) =>
        index % 2 != 0 ? <AssistantMessage>{message}</AssistantMessage> : <UserMessage>{message}</UserMessage>
      )}
    </ChatCompletion>
  );
}
