import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';
import { OpenAIChatModel } from 'ai-jsx/lib/openai';
import { AnthropicChatModel } from 'ai-jsx/lib/anthropic';
import { ChatProvider } from 'ai-jsx/core/completion';
import * as AI from 'ai-jsx';
import { pino } from 'pino';
import { PinoLogger } from 'ai-jsx/core/log';

function App() {
  return (
    <ChatCompletion>
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

logger.info('Using models explicitly');
console.log(
  await AI.createRenderContext({ logger: new PinoLogger(logger) }).render(
    <>
      * Anthropic:{' '}
      <ChatProvider component={AnthropicChatModel} model="claude-1">
        <App />
      </ChatProvider>
      {'\n\n'}* OpenAI:{' '}
      <ChatProvider component={OpenAIChatModel} model="gpt-3.5-turbo">
        <App />
      </ChatProvider>
    </>
  )
);

logger.info('Using OpenAI because both keys are set');
console.log(await AI.createRenderContext({ logger: new PinoLogger(logger) }).render(<App />));

logger.info('Using OpenAI because only its key is set');
process.env.OPENAI_API_KEY = originalOpenAIKey;
delete process.env.ANTHROPIC_API_KEY;
console.log(await AI.createRenderContext({ logger: new PinoLogger(logger) }).render(<App />));

logger.info('Using Anthropic');
process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
delete process.env.OPENAI_API_KEY;
console.log(await AI.createRenderContext({ logger: new PinoLogger(logger) }).render(<App />));
