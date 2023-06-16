import * as LLMx from 'ai-jsx';
import { Completion } from 'ai-jsx/core/completion';
import { showInspector } from 'ai-jsx/core/inspector';

function App() {
  return (
    <Completion maxTokens={100}>
      Q: Why is the sky blue?{'\n'}
      A:
    </Completion>
  );
}

showInspector(<App />);
