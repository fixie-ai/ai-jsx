import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { LLMx } from '../../../ai-jsx/src/lib/index.js';
import { ChatCompletion, SystemMessage, UserMessage } from '../../../ai-jsx/src/lib/completion-components.js';
import { showInspector } from '../../../ai-jsx/src/inspector/console.js';

function loadData() {
  const directoryOfThisFile = path.dirname(fileURLToPath(import.meta.url));
  const filePath = path.join(directoryOfThisFile, 'data.json');
  return fs.readFile(filePath, 'utf-8');
}

async function App() {
  const myData = await loadData();
  return (
    <ChatCompletion>
      <UserMessage>Tell me about this JSON: {myData}</UserMessage>
    </ChatCompletion>
  );
}

showInspector(<App />);
// console.log(await LLMx.createRenderContext().render(<App />));

function MakeCharacter() {
  return (
    <ChatCompletion temperature={1}>
      <UserMessage>Write a short bio of a character in a fantasy novel.</UserMessage>
    </ChatCompletion>
  );
}

function Constitutional({ children }: { children: string }) {
  return (
    <ChatCompletion>
      <SystemMessage>
        If the user's message is inappropriate for kids, rewrite it so it is. Otherwise, return the user's message
        as-is.
      </SystemMessage>
      <UserMessage>{children}</UserMessage>
    </ChatCompletion>
  );
}

function WriteStory() {
  return (
    <ChatCompletion temperature={1}>
      <UserMessage>
        Write a story about these three characters:
        <Constitutional>
          <MakeCharacter />
        </Constitutional>
        <Constitutional>
          <MakeCharacter />
        </Constitutional>
        <Constitutional>
          <MakeCharacter />
        </Constitutional>
      </UserMessage>
    </ChatCompletion>
  );
}

// showInspector(<WriteStory />)
// console.log(await LLMx.createRenderContext().render(<WriteStory />));
