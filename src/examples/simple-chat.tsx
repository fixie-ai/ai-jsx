import { LLMx } from '../lib/index.js';
import { ChatCompletion, SystemMessage, UserMessage } from '../lib/completion-components.js';

function App() {
  return (
    <ChatCompletion>
      <SystemMessage>You are an assistant who only uses one syllable words.</SystemMessage>
      <UserMessage>Why is the sky blue?</UserMessage>
    </ChatCompletion>
  );
}

await LLMx.show(<App />);
