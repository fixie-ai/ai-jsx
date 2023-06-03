import { LLMx } from '../lib/index.js';
import { Completion } from '../lib/completion-components.js';

function App() {
  return (
    <Completion maxTokens={100}>
      Q: Why is the sky blue?{'\n'}
      A:
    </Completion>
  );
}

await LLMx.show(<App />);
