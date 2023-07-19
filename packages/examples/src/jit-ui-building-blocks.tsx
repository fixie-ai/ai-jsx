import { ChatCompletion, ChatProvider, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { JsonChatCompletion } from 'ai-jsx/batteries/constrained-output';
import { showInspector } from 'ai-jsx/core/inspector';
import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'node:url';
import { OpenAIChatModel } from 'ai-jsx/lib/openai';
import * as AI from 'ai-jsx';
import { z } from 'zod';

const currentPath = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentPath, '..', '..', '..');

function removeMdxCodeBlockBoundaries(markdown: string): string {
  const mdxBlockPattern = /```mdx([\s\S]*?)```/g;
  return markdown.replace(mdxBlockPattern, '$1');
}

// // I'm not sure this is necessary. Sometimes the model obeys the instruction to omit the ```mdx and ``` lines. Also I don't think this works with the append only mode.
async function* RemoveMDXLines({ children }: { children: AI.Node }, { render }: AI.ComponentContext) {
  yield '';
  const frames = render(children);
  for await (const frame of frames) {
    yield removeMdxCodeBlockBoundaries(frame);
  }
  const finalResult = await frames;
  return removeMdxCodeBlockBoundaries(finalResult);
}

function App() {
  /* prettier-ignore */
  return (<>
    {/* 
        This creates a good output, but it'll only work with streaming if we come up with a way 
        to heal/"untruncate" the partial MDX, which could be a bit tricky.
    */}
    ==================== MDX Agent ===================={'\n'}
    <RemoveMDXLines>
      <MdxAgent />
    </RemoveMDXLines>

    {/* 
        This creates bad output. The model disregards the instruction to only emit JSON. It emits a mixture of JSON and markdown that looks like:

            For the JSON shape of a character in a fantasy game, we can consider including information like the character's name, race, class, level, and attributes like strength, dexterity, constitution, intelligence, wisdom, and charisma.

            Here is an example JSON for such a character:

            ```json
            {
              "name": "Gandalf",
              "race": "Maia",
            }
            ```

            And here is a form to create your own character:

            ```json
            {
                "type": "jsx",
                "content": [
                    {
                        "tag": "StackedForm",
                        "props": {
                            "children": [
                                {
                                    "tag": "InputWithLabel",
    */}
    ==================== JSON Agent (self-prompted) ===================={'\n'}
    <JsonAgent />

    {/*
      This creates bad output. It emits short output: 

          "{\n  \"response\": {\n    \"type\": \"md\",\n    \"content\": \"Here is an example JSON for a character in a fantasy game:\"\n  }\n}

      Sometimes, I'll see it include prose and say "now, let's give you a form to edit this character", but then it stops output before actually producing the form.
    */}
    ==================== JSON Agent (using JsonChatCompletion) ===================={'\n'}
    <JsonChatCompletionAgent />
  </>
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
        <SystemMessage>You are an assistant who can use React components to work with the user. All your responses should be in MDX, which is Markdown For the Component Era. Here are instructions for how to use MDX:

        === Begin instructions
          {await mdxDocsRequest.text()}
        === End instructions

        However, there are some special MDX instructions for you:
        1. Do not include import statements. Everything you need will be in scope automatically.
        1. Do not include a starting ```mdx and closing ``` line. Just respond with the MDX itself.
        1. Do not use MDX expressions (e.g. "Result of addition: {1 + 1}").
        1. If you have a form, don't explicitly explain what the form does – it should be self-evident. Don't say something like "the submit button will save your entry".
        1. Don't say anything to the user about MDX. Don't say "I am using MDX" or "I am using React" or "here's an MDX form".
        1. If you're making a form, use the props on the form itself to explain what the fields mean / provide guidance. This is preferable to writing out separate prose. Don't include separate instructions on how to use the form if you can avoid it.

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

async function JsonChatCompletionAgent() {
  const buildingBlocksContent = fs.readFile(
    path.join(packageRoot, 'packages/nextjs-demo/src/components/BuildingBlocks.tsx'),
    'utf-8'
  );
  const componentSchema: any = z.object({
    tag: z.string(),
    props: z.intersection(
      z.record(z.any()),
      z.lazy(() => z.object({ children: z.array(componentSchema).or(componentSchema) }))
    ),
  });

  const responseSchema = z.union([
    z.object({
      type: z.literal('md'),
      content: z.string(),
    }),
    z.object({
      type: z.literal('jsx'),
      content: z.array(componentSchema),
    }),
  ]);

  const rootSchema = z.object({
    response: responseSchema,
  });

  return (
    <ChatProvider component={OpenAIChatModel} model="gpt-4">
      <JsonChatCompletion schema={rootSchema}>
        {/* prettier-ignore */}
        <SystemMessage>You are an assistant who is an expert at using Markdown and UI components to help the user accomplish their goals.

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
      </JsonChatCompletion>
    </ChatProvider>
  );
}

async function JsonAgent() {
  const buildingBlocksContent = fs.readFile(
    path.join(packageRoot, 'packages/nextjs-demo/src/components/BuildingBlocks.tsx'),
    'utf-8'
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
  showInspector(<JsonAgent />);
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
