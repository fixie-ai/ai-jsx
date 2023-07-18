import { ChatCompletion, ChatProvider, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { showInspector } from 'ai-jsx/core/inspector';
import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'node:url';
import { OpenAIChatModel } from 'ai-jsx/lib/openai';
import * as AI from 'ai-jsx';

const currentPath = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentPath, '..', '..', '..');

function removeMdxCodeBlockBoundaries(markdown: string): string {
  const mdxBlockPattern = /```mdx([\s\S]*?)```/g;
  return markdown.replace(mdxBlockPattern, '$1');
}

// // I'm not sure this is necessary. Sometimes the model obeys the instruction to omit the ```mdx and ``` lines.
async function* RemoveMDXLines({ children }: { children: AI.Node }, { render }: AI.ComponentContext) {
  yield '';
  const frames = render(children);
  for await (const frame of frames) {
    yield removeMdxCodeBlockBoundaries(frame);
  }
  // const finalResult = await frames;
  // return finalResult.replace(/```mdx | ```/g, '\n');
}

function App() {
  return (
    // @ts-expect-error
    <RemoveMDXLines>
      <MdxAgent />
      {/* If we just have a raw string, the entire program outputs the empty string. I'm not sure why. */}
      {/* prefix
    ```mdx foo bar ```
    suffix */}
    </RemoveMDXLines>
  );
}

async function MdxAgent() {
  const buildingBlocksContent = fs.readFile(
    path.join(packageRoot, 'packages/nextjs-demo/src/components/BuildingBlocks.tsx'),
    'utf-8'
  );
  const mdxDocsRequest = await fetch(
    'https://raw.githubusercontent.com/mdx-js/mdx/main/docs/docs/what-is-mdx.server.mdx'
  );
  return (
    <ChatProvider component={OpenAIChatModel} model="gpt-4">
      <ChatCompletion>
        {/* prettier-ignore */}
        <SystemMessage>You are an assistant who is an expert at using Markdown and UI components to help the user accomplish their goals.
          Your responses should be in a JSON object that matches this type:

        {`
        type Component = {
          /* The name of the component, like "Card" or "Button" */
          tag: string
          props: {children: Component | Component[]} & Record<any, any>
        }
        
        type Response = {
          type: 'md'
          /** Markdown content */
          content: string
        } | {
          type: 'jsx'
          /** JSX content */
          content: Component[]
        }
        `}

        Respond only with this JSON. Do not respond with anything else. Your entire response should be this JSON. 

        For example:
          User: I'd like to book a flight
          AI: {`[{ "type": "md", "content": "Here are some flights:" }, {"type": "jsx", "content": [{"tag": "Card", "props": {"children": "Flight 1"}}]}]`}

        Here is the source code for the components you can use:
        === Begin source code
        {await buildingBlocksContent}
        === End source code

        For example, to display data for an entity, use a Card component.
      </SystemMessage>
        <UserMessage>
          Invent a short JSON shape for a character in a fantasy game. First, show me an example (as raw JSON). Next,
          show me a form that I can use to make my own instance of this JSON.
        </UserMessage>
      </ChatCompletion>
    </ChatProvider>
  );
}

const useInspector = false;

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (useInspector) {
  showInspector(<MdxAgent />);
} else {
  let lastValue = '';
  const rendering = AI.createRenderContext().render(<App />, { appendOnly: true });
  for await (const frame of rendering) {
    process.stdout.write(frame.slice(lastValue.length));
    lastValue = frame;
  }

  const finalResult = await rendering;
  process.stdout.write(finalResult.slice(lastValue.length));
}
