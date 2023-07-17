import { ChatCompletion, ChatProvider, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { showInspector } from 'ai-jsx/core/inspector';
import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'node:url';
import { OpenAIChatModel } from 'ai-jsx/lib/openai';

const currentPath = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentPath, '..', '..', '..');

async function App() {
  const buildingBlocksContent = fs.readFile(path.join(packageRoot, 'packages/nextjs-demo/src/components/BuildingBlocks.tsx'), 'utf-8')
  const mdxDocsRequest = await fetch('https://raw.githubusercontent.com/mdx-js/mdx/main/docs/docs/what-is-mdx.server.mdx');
  return (
    <ChatProvider component={OpenAIChatModel} model="gpt-4">
    <ChatCompletion>
      <SystemMessage>You are an assistant who can use React components to work with the user. All your responses should be in MDX, which is Markdown For the Component Era. Here are instructions for how to use MDX:

        === Begin instructions
          {await mdxDocsRequest.text()}
        === End instructions

        However, there are some special MDX instructions for you:
        1. Do not include import statements. Everything you need will be in scope automatically.
        1. Do not include a starting ```mdx and closing ``` line. Just respond with the MDX itself. 
        
        Here is the source code for the components you can use: 
        === Begin source code
        {await buildingBlocksContent}
        === End source code

        For example, to display data for an entity, use a Card component.
      </SystemMessage>
      <UserMessage>Show me a UI for this: {JSON.stringify({ name: 'Sam', role: 'Adventurer', level: 42})}</UserMessage>
    </ChatCompletion>
    </ChatProvider>
  );
}

showInspector(<App />);
