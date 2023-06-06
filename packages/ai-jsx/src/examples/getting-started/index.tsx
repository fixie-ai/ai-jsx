import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { LLMx } from '../../lib/index.ts';
import { ChatCompletion, UserMessage } from '../../lib/completion-components.tsx';
import { showInspector } from '../../inspector/console.tsx';

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

showInspector(<App />)
// console.log(await LLMx.createRenderContext().render(<App />));

// function MakeCharacter() {
//   return (
//     <ChatCompletion temperature={1}>
//       <UserMessage>Write a short bio of a character in a fantasy novel.</UserMessage>
//     </ChatCompletion>
//   )
// }

// function WriteStory() {
//   return (
//     <ChatCompletion temperature={1}>
//       <UserMessage>Write a story about these three characters:

//         <MakeCharacter />
//         <MakeCharacter />
//         <MakeCharacter />
//       </UserMessage>
//     </ChatCompletion>
//   )
// }

// showInspector(<WriteStory />)
// console.log(await LLMx.createRenderContext().render(<WriteStory />));
