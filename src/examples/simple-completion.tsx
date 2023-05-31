import { LLMx } from '../lib';
import { Completion } from '../lib/completion-components';

function App() {
  return (
    <Completion maxTokens={100}>
      Q: Why is the sky blue?{'\n'}
      A:
    </Completion>
  );
}

await LLMx.show(<App />);
