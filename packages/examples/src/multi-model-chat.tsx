import { ChatCompletion, UserMessage, SystemMessage } from 'ai-jsx/core/completion';
import { OpenAI } from 'ai-jsx/lib/openai';
import { Anthropic } from 'ai-jsx/lib/anthropic';
import * as AI from 'ai-jsx';

function App() {
  return (
    <ChatCompletion>
      <SystemMessage>Answer in an excited tone.</SystemMessage>
      <UserMessage>Why is the sky blue?</UserMessage>
    </ChatCompletion>
  );
}

const originalOpenAIKey = process.env.OPENAI_API_KEY;
const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;

if (!(originalAnthropicKey && originalOpenAIKey)) {
  throw new Error('This demo only works if you set both env vars "OPENAI_API_KEY" and "ANTHROPIC_API_KEY".');
}
console.log('Using models explicitly');
console.log(
  await AI.createRenderContext()
    .render(
      <>
        * Anthropic:{' '}
        <Anthropic chatModel="claude-2">
          <App />
        </Anthropic>
        {'\n\n'}* OpenAI:{' '}
        <OpenAI chatModel="gpt-3.5-turbo">
          <App />
        </OpenAI>
      </>
    )
    .toStringAsync()
);

console.log('Using OpenAI because both keys are set');
console.log(
  await AI.createRenderContext()
    .render(<App />)
    .toStringAsync()
);

console.log('Using OpenAI because only its key is set');
process.env.OPENAI_API_KEY = originalOpenAIKey;
delete process.env.ANTHROPIC_API_KEY;
console.log(
  await AI.createRenderContext()
    .render(<App />)
    .toStringAsync()
);

console.log('Using Anthropic');
process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
delete process.env.OPENAI_API_KEY;
console.log(
  await AI.createRenderContext()
    .render(<App />)
    .toStringAsync()
);

console.log('Streaming Anthropic');
for await (const chunk of AI.createRenderContext().render(<App />)) {
  process.stdout.write(chunk);
}
