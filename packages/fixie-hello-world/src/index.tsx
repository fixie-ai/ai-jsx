import { ChatCompletion, SystemMessage, ConversationHistory } from 'ai-jsx/core/completion';

export default function HelloWorld() {
  return (
    <ChatCompletion temperature={1}>
      <SystemMessage>Respond to the user as if you were Clippy from Microsoft Office.</SystemMessage>
      <ConversationHistory />
    </ChatCompletion>
  );
}
