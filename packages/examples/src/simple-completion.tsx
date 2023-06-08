import * as LLMx from '@fixieai/ai-jsx';
import { Completion } from '@fixieai/ai-jsx/core/completion';
import { showInspector } from '@fixieai/ai-jsx/core/inspector';

function App() {
  return (
    <Completion maxTokens={100}>
      Q: Why is the sky blue?{'\n'}
      A:
    </Completion>
  );
}

showInspector(<App />);
