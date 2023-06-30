import * as AI from 'ai-jsx';
import { Prompt } from 'ai-jsx/batteries/prompts';
import { ChatCompletion, ChatProvider, UserMessage } from 'ai-jsx/core/completion';
import { AnthropicChatModel } from 'ai-jsx/lib/anthropic';
import { loadJsonFile } from 'load-json-file';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Run `yarn workspace examples demo:repo-qa:etl` before running this demo.
 */

type Files = Record<string, string>;

const dirname = path.dirname(fileURLToPath(import.meta.url));

async function RepoFiles() {
  const files = await loadJsonFile<Files>(path.join(dirname, 'repo-files.json'));
  return <>
    {Object.entries(files).map(([path, contents]) => <>
      ====
      File Path: {path}
      File Contents: {contents}
      ====
    </>)}
  </>
}

function App({question}: {question: string}) {
  return <ChatProvider component={AnthropicChatModel} model="claude-instant-1-100k">
  <ChatCompletion>
    <UserMessage>
      <Prompt persona='expert software engineer' />
      Answer the my questions based on your knowledge of the AI.JSX repo.
      Here's what you know about the repo: <RepoFiles />
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

/* Other questions I tried:

"I want to submit a PR to this repo that expands its AI + UI integration. I'd like to improve performance and reliability of the AI generating UI elements. What files should I modify to do this? Give me the full file paths."

"The repo has support for Weights and Biases integration, but there are no docs for it. Write those docs. Tell me which docs files you'd modify or create, and what the content should be."

*/

await askQuestion("Anthropic just released a new model, called `claude-2`. I want to update the AI.JSX package to support this model. Write me a diff of the changes required to do that. Include any necessary changes to documentation.");
