import { ChatCompletion, UserMessage, SystemMessage } from 'ai-jsx/core/completion';
import { OpenAI } from 'ai-jsx/lib/openai';
import { Anthropic } from 'ai-jsx/lib/anthropic';
import * as AI from 'ai-jsx';
import { pino } from 'pino';
import { PinoLogger } from 'ai-jsx/core/log';

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

const logger = pino({
  name: 'ai-jsx',
  level: process.env.loglevel ?? 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

// logger.info('Using models explicitly');
// console.log(
//   await AI.createRenderContext({ logger: new PinoLogger(logger) }).render(
//     <>
//       * Anthropic:{' '}
//       <Anthropic chatModel="claude-1">
//         <App />
//       </Anthropic>
//       {'\n\n'}* OpenAI:{' '}
//       <OpenAI chatModel="gpt-3.5-turbo">
//         <App />
//       </OpenAI>
//     </>
//   )
// );

// logger.info('Using OpenAI because both keys are set');
// console.log(await AI.createRenderContext({ logger: new PinoLogger(logger) }).render(<App />));

// logger.info('Using OpenAI because only its key is set');
// process.env.OPENAI_API_KEY = originalOpenAIKey;
// delete process.env.ANTHROPIC_API_KEY;
// console.log(await AI.createRenderContext({ logger: new PinoLogger(logger) }).render(<App />));

logger.info('Using Anthropic');
process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
delete process.env.OPENAI_API_KEY;
console.log(await AI.createRenderContext({ logger: new PinoLogger(logger) }).render(<App />));

// logger.info('Streaming Anthropic');
// const rendering = AI.createRenderContext({ logger: new PinoLogger(logger) }).render(<App />);
// let lastValue = '';
// for await (const frame of rendering) {
//   process.stdout.write(frame.slice(lastValue.length));
//   lastValue = frame;
// }

// const finalResult = await rendering;
// process.stdout.write(finalResult.slice(lastValue.length));
