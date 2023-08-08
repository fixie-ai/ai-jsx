/**
 * To make this demo work, comment out the `import 'server-only'` line in `ai-jsx/experimental/next`.
 */

/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/experimental/next';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';
import { makeComponentMap } from 'ai-jsx/react/map';
import { pino } from 'pino';
import { PinoLogger } from 'ai-jsx/core/log';

function App(_: {}, { memo }: AI.ComponentContext) {
  const chatCompletion = memo(
    <ChatCompletion temperature={1}>
      <UserMessage>List five dog names</UserMessage>
    </ChatCompletion>
  );

  return (
    <>
      {chatCompletion}
      <Slow delay={2000} />
    </>
  );
}

async function Slow({ delay }: { delay: number }) {
  // By default, this demo will show that the tree stream waits for `Slow` to complete before rendering anything.
  // If we `yield ''`, the problem is solved.

  // yield ''
  await new Promise((resolve) => setTimeout(resolve, delay));
  return ` returned after ${delay}`;
}

const pinoStdoutLogger = pino({
  name: 'ai-jsx',
  level: process.env.loglevel ?? 'trace',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

const decoder = new TextDecoder();

const response = await AI.toReactStream(makeComponentMap({}), <App />, {
  logger: new PinoLogger(pinoStdoutLogger),
});
const body = await response.body;
const reader = body.getReader();
// eslint-disable-next-line no-constant-condition
while (true) {
  const { done, value } = await reader.read();
  if (done) {
    break;
  }
  process.stdout.write(decoder.decode(value));
}
