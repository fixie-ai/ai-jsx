import { LLMx } from '../lib/index.ts';
import { Completion } from '../lib/completion-components.tsx';

function App() {
  return (
    <Completion maxTokens={100}>
      Q: Why is the sky blue?{'\n'}
      A:
    </Completion>
  );
}

await LLMx.show(<App />);
