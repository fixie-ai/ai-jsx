import { LLMx } from '../lib/index.ts';
import { ChatCompletion, SystemMessage, UserMessage } from '../lib/completion-components.tsx';
import { showInspector } from '../inspector/console.tsx';

function App() {
  return (
    <ChatCompletion>
      <SystemMessage>You are an assistant who only uses one syllable words.</SystemMessage>
      <UserMessage>Why is the sky blue?</UserMessage>
    </ChatCompletion>
  );
}

showInspector(<App />);
