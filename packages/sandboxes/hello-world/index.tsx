import * as LLMx from 'ai-jsx';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { PinoLogger } from 'ai-jsx/core/log';
import { pino } from 'pino';

function App() {
  return (
    <ChatCompletion>
      <SystemMessage>You are an agent that only asks rhetorical questions.</SystemMessage>
      <UserMessage>How can I learn about Ancient Egypt?</UserMessage>
    </ChatCompletion>
  );
}
const pinoStdoutLogger = pino({
  name: 'ai-jsx',
  level: process.env.loglevel ?? 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

console.log(
  await LLMx.createRenderContext({
    logger: new PinoLogger(pinoStdoutLogger),
  }).render(<App />)
);
