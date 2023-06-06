import { LLMx } from '../lib/index.ts';
import { Completion } from '../lib/completion-components.tsx';
import { showInspector } from '../inspector/console.tsx';

function App() {
  return (
    <Completion maxTokens={100}>
      Q: Why is the sky blue?{'\n'}
      A:
    </Completion>
  );
}

showInspector(<App />);
