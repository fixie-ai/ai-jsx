import * as LLMx from '@fixieai/ai-jsx';
import { ChatCompletion, SystemMessage, UserMessage } from '@fixieai/ai-jsx/dist/cjs/core/completion';
import { showInspector } from '@fixieai/ai-jsx/dist/cjs/inspector/console';

function App() {
  return (
    <ChatCompletion>
      <SystemMessage>You are an assistant who only uses one syllable words.</SystemMessage>
      <UserMessage>Why is the sky blue?</UserMessage>
    </ChatCompletion>
  );
}

console.log(await LLMx.createRenderContext().render(<App />));
// showInspector(<App />);
