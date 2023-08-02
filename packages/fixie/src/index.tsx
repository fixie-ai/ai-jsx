import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';

export default function HelloWorld({ message }: { message: string }) {
  return (
    <ChatCompletion>
      <SystemMessage>Respond to the user using some variant of the phrase "Hello World!".</SystemMessage>
      <UserMessage>{message}</UserMessage>
    </ChatCompletion>
  );
}
