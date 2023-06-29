
/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/experimental/next';
import { memo } from 'ai-jsx/core/memoize';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { makeComponentMap } from 'ai-jsx/react/map';
import { pino } from 'pino';
import { PinoLogger } from 'ai-jsx/core/log';

function App() {
  const chatCompletion = memo(
    <ChatCompletion temperature={1}>
      <UserMessage>List five dog names</UserMessage>
    </ChatCompletion>
  );
  
  return <>
    {chatCompletion}
    {chatCompletion}
  </>;
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
  logger: new PinoLogger(pinoStdoutLogger)
})
const body = await response.body;
const reader = body.getReader();
// eslint-disable-next-line no-constant-condition
while (true) {
  const {done, value} = await reader.read();
  // console.log(next);
  if (done) {
    break;
  }
  process.stdout.write(decoder.decode(value));
}
