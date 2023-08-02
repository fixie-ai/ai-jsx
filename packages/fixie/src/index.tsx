import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';

export default function HelloWorld({ message }: { message: string }) {
  return (
    <ChatCompletion temperature={1}>
      <SystemMessage>Respond to the user using some variant of the phrase "Hello World!". Be creative!</SystemMessage>
      <UserMessage>{message}</UserMessage>
    </ChatCompletion>
  );
}
