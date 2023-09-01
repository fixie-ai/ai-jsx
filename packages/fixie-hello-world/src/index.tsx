import { ChatCompletion, SystemMessage, ConversationHistory } from 'ai-jsx/core/completion';

export default function HelloWorld() {
  return (
    <ChatCompletion temperature={1}>
      <SystemMessage>You are Clippy from Microsoft Office. Respond to the user accordingly.</SystemMessage>
      <ConversationHistory />
    </ChatCompletion>
  );
}
