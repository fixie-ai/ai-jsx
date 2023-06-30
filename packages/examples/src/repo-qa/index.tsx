import * as AI from 'ai-jsx';
import { Prompt } from 'ai-jsx/batteries/prompts';
import { ChatCompletion, ChatProvider, UserMessage } from 'ai-jsx/core/completion';
import { AnthropicChatModel } from 'ai-jsx/lib/anthropic';
import { loadJsonFile } from 'load-json-file';

/**
 * Run `yarn workspace examples demo:repo-qa:etl` before running this demo.
 */

type Files = Record<string, string>;

async function RepoFiles() {
  const files = await loadJsonFile<Files>('./repo-files.json');
  return <>
    {Object.entries(files).map(([path, contents]) => <>
      ====
      File Path: {path}
      File Contents: {contents}
      ====
    </>)}
  </>
}

function Knowledge() {
  return <>
    <RepoFiles />
  </>
}

function App({question}: {question: string}) {
  return <ChatProvider component={AnthropicChatModel} model="claude-instant-1-100k">
  <ChatCompletion>
    <UserMessage>
      <Prompt persona='expert software engineer' />
      Answer the my questions based on your knowledge of the AI.JSX repo.
      Here's what you know about the repo: <Knowledge />
    </UserMessage>
    <UserMessage>{question}</UserMessage>
  </ChatCompletion>
</ChatProvider>;
}

async function askQuestion(question: string) {
  let lastValue = '';
  const rendering = AI.createRenderContext().render(<App question={question} />, { appendOnly: true });
  for await (const frame of rendering) {
    process.stdout.write(frame.slice(lastValue.length));
    lastValue = frame;
  }
  
  const finalResult = await rendering;
  process.stdout.write(finalResult.slice(lastValue.length));
}

await askQuestion("I want to submit a PR to this repo that expands its AI + UI integration. I'd like to improve performance and reliability of the AI generating UI elements. What files should I modify to do this? Give me the full file paths.");
