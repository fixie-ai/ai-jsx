import { LLMx } from '../../ai-jsx/src/lib/index.js';
import { ChatCompletion, SystemMessage, UserMessage } from '../../ai-jsx/src/core/completion.tsx';
import { showInspector } from '../../ai-jsx/src/inspector/console.js';

function App() {
  return (
    <ChatCompletion>
      <SystemMessage>You are an assistant who only uses one syllable words.</SystemMessage>
      <UserMessage>Why is the sky blue?</UserMessage>
    </ChatCompletion>
  );
}

showInspector(<App />);
