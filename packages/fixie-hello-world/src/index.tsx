import { ChatCompletion, SystemMessage, ConversationHistory } from 'ai-jsx/core/completion';

console.log('Fixie Hello World agent starting.');

export default function HelloWorld({
  character = 'Clippy from Microsoft Office',
  temperature = 1,
}: {
  character?: string;
  temperature?: number;
}) {
  return (
    <ChatCompletion temperature={temperature}>
      <SystemMessage>You are {character}. Respond to the user accordingly.</SystemMessage>
      <ConversationHistory />
    </ChatCompletion>
  );
}
