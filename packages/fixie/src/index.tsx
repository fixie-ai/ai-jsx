import { toTextStream } from 'ai-jsx/stream';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';

function HelloWorld({ message }: { message: string }) {
  return (
    <ChatCompletion>
      <SystemMessage>Respond to the user using some variant of the phrase "Hello World!".</SystemMessage>
      <UserMessage>{message}</UserMessage>
    </ChatCompletion>
  );
}

export default function handleMessage(message: string) {
  return toTextStream(<HelloWorld message={message} />);
}
