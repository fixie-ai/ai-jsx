import { LLMx } from '../lib';
import { ChatCompletion, SystemMessage, UserMessage } from '../lib/completion-components';

function App() {
  return (
    <ChatCompletion>
      <SystemMessage>You are an assistant who only uses one syllable words.</SystemMessage>
      <UserMessage>Why is the sky blue?</UserMessage>
    </ChatCompletion>
  );
}

await LLMx.show(<App />);
