import * as AI from 'ai-jsx';
import { Prompt } from 'ai-jsx/batteries/prompts';
import { ChatCompletion, ChatProvider, UserMessage } from 'ai-jsx/core/completion';
import { AnthropicChatModel } from 'ai-jsx/lib/anthropic';
import { OpenAIChatModel } from 'ai-jsx/lib/openai';
import { loadJsonFile } from 'load-json-file';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import GPT3Tokenizer from 'gpt3-tokenizer';
import { pino } from 'pino';
import { PinoLogger } from 'ai-jsx/core/log';
import fs from 'fs/promises';

/**
 * Run `yarn workspace examples demo:repo-qa:etl` before running this demo.
 */

/**
 * This demo hangs. I don't know why. There's nothing in the logging that provides an immediate clue. 
 */

type Files = Record<string, string>;

const dirname = path.dirname(fileURLToPath(import.meta.url));

async function RepoFiles(
  { repoFileFilter, question }: { question: string; repoFileFilter: RegExp[] },
  { logger }: AI.ComponentContext
) {
  const files = await loadJsonFile<Files>(path.join(dirname, 'repo-files.json'));
  const filteredFiles = Object.entries(files).filter(([path]) => repoFileFilter.some((regex) => regex.test(path)));

  const tokenCount = new GPT3Tokenizer.default({ type: 'gpt3' }).encode(JSON.stringify(filteredFiles)).text.length;

  logger.warn({ tokenCount, question }, 'Token count for the repo files included in the prompt.');
  return (
    <>
      {filteredFiles.map(([path, contents]) => (
        <>
          ==== File Path: {path}
          File Contents: {contents}
          ====
        </>
      ))}
    </>
  );
}

function QA({ question, repoFileFilter }: { question: string; repoFileFilter: RegExp[] }) {
  return (
    <ChatCompletion>
      <UserMessage>
        <Prompt persona="expert software engineer" />
        Answer the my questions based on your knowledge of the AI.JSX repo. Here's what you know about the repo:{' '}
        <RepoFiles repoFileFilter={repoFileFilter} question={question} />
      </UserMessage>
      <UserMessage>{question}</UserMessage>
    </ChatCompletion>
  );
}

function AskAndAnswer({ question, repoFileFilter }: { question: string; repoFileFilter: RegExp[] }) {
  return (
    <>
      {question}
      {'\n\n'}
      GPT-4:{' '}
      <ChatProvider component={OpenAIChatModel} model="gpt-4-32k">
        <QA question={question} repoFileFilter={repoFileFilter} />
      </ChatProvider>
      {'\n\n'}
      Anthropic:{' '}
      <ChatProvider component={AnthropicChatModel} model="claude-instant-1-100k">
        <QA question={question} repoFileFilter={[/.*/]} />
      </ChatProvider>
      {'\n\n'}
    </>
  );
}

function App() {
  const coreRegex = /packages\/ai-jsx\/src\/core/;
  const docsRegex = /packages\/docs\/docs\/.*\.mdx?/;

  return (
    <>
      <AskAndAnswer
        question="I want to submit a PR to this repo that expands its AI + UI integration. I'd like to improve performance and reliability of the AI generating UI elements. What files should I modify to do this? Give me the full file paths."
        repoFileFilter={[coreRegex]}
      />

      <AskAndAnswer
        question="The repo has support for Weights and Biases integration, but there are no docs for it. Write those docs. Tell me which docs files you'd modify or create, and what the content should be."
        repoFileFilter={[coreRegex, docsRegex]}
      />

      <AskAndAnswer
        question="Anthropic just released a new model, called `claude-2`. I want to update the AI.JSX package to support this model. Write me a diff of the changes required to do that. Include any necessary changes to documentation."
        repoFileFilter={[coreRegex]}
      />
    </>
  );
}

await fs.unlink('./ai-jsx.log');
const pinoLogger = pino(
  {
    name: 'ai-jsx',
    level: process.env.loglevel ?? 'trace',
  },
  pino.destination('./ai-jsx.log')
);
console.log('Writing logs to', path.join(process.cwd(), 'ai-jsx.log'));
let lastValue = '';
const rendering = AI.createRenderContext({ logger: new PinoLogger(pinoLogger) }).render(<App />);
for await (const frame of rendering) {
  process.stdout.write(frame.slice(lastValue.length));
  lastValue = frame;
}

const finalResult = await rendering;
process.stdout.write(finalResult.slice(lastValue.length));
