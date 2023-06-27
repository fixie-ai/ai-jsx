import { createRenderContext } from 'ai-jsx';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';

function App() {
  return (
    <>
      This example renders an AI.JSX tree in append-only mode, where rendering guarantees that each frame will append to
      the previous one.{'\n'}
      Here's some static text before!{'\n\n'}
      Why is the sky blue?{' '}
      <ChatCompletion>
        <UserMessage>Why is the sky blue?</UserMessage>
      </ChatCompletion>
      {'\n\n'}
      Why is Mars red?{' '}
      <ChatCompletion>
        <UserMessage>Why is Mars red?</UserMessage>
      </ChatCompletion>
      {'\n\n'}
      And here's some static text after!
    </>
  );
}

let lastValue = '';
const rendering = createRenderContext().render(<App />, { appendOnly: true });
for await (const frame of rendering) {
  process.stdout.write(frame.slice(lastValue.length));
  lastValue = frame;
}

const finalResult = await rendering;
process.stdout.write(finalResult.slice(lastValue.length));
