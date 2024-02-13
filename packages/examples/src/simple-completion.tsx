import { Completion } from 'ai-jsx/core/completion';
import { showJSX } from './utils.js';

function App() {
  return (
    <Completion maxTokens={100}>
      Q: Why is the sky blue?{'\n'}
      A:
    </Completion>
  );
}

showJSX(<App />);
