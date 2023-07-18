import { UserMessage, ChatProvider } from 'ai-jsx/core/completion';
import { JsonChatCompletion, YamlChatCompletion } from 'ai-jsx/batteries/constrained-output';
import { showInspector } from 'ai-jsx/core/inspector';
import z from 'zod';
import * as AI from 'ai-jsx';
import { pino } from 'pino';
import { PinoLogger } from 'ai-jsx/core/log';

const FamilyTree: z.Schema = z.array(
  z.object({
    name: z.string(),
    children: z.lazy(() => FamilyTree).optional(),
  })
);

const RootFamilyTree: z.Schema = z.object({
  tree: FamilyTree,
});

function App() {
  const query = 'Create a nested family tree with names and ages. It should include a total of 5 people.';
  return (
    <>
      JSON generation example:{'\n'}
      <ChatProvider model="gpt-4">
        <JsonChatCompletion schema={RootFamilyTree}>
          <UserMessage>{query}</UserMessage>
        </JsonChatCompletion>
      </ChatProvider>
      {/* {'\n\n'}
      YAML generation example:{'\n'}
      <YamlChatCompletion schema={FamilyTree}>
        <UserMessage>{query}</UserMessage>
      </YamlChatCompletion> */}
    </>
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

showInspector(<App />);
// await AI.createRenderContext({
//   logger: new PinoLogger(pinoStdoutLogger),
// }).render(<App />);

// let lastValue = '';
// const rendering = AI.createRenderContext().render(<App />, { appendOnly: true });
// for await (const frame of rendering) {
//   process.stdout.write(frame.slice(lastValue.length));
//   lastValue = frame;
// }

// const finalResult = await rendering;
// process.stdout.write(finalResult.slice(lastValue.length));
