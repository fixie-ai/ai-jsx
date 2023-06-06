import { LLMx } from '../lib/index.js';
import { Completion } from '../lib/completion-components.jsx';
import { showInspector } from '../inspector/console.jsx';

function App() {
  return (
    <Completion maxTokens={100}>
      Q: Why is the sky blue?{'\n'}
      A:
    </Completion>
  );
}

showInspector(<App />);
