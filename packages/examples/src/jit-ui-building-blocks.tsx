import { ChatCompletion, ChatProvider, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { showInspector } from 'ai-jsx/core/inspector';
import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'node:url';
import { OpenAIChatModel } from 'ai-jsx/lib/openai';
import * as AI from 'ai-jsx';
import { compileSync } from '@mdx-js/mdx';

const currentPath = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentPath, '..', '..', '..');

// const input = `
// import YouTube from "./YouTube";

// # Welcome

// <YouTube id="123" />
// `;

// const compiler = createMdxAstCompiler({ remarkPlugins: [] });
// const ast = compiler.parse(input);
// const astString = JSON.stringify(ast, null, 2);
// console.log(astString);

// function removeMdxCodeBlockBoundaries(markdown: string): string {
//   const mdxBlockPattern = /```mdx([\s\S]*?)```/g;
//   return markdown.replace(mdxBlockPattern, '$1');
// }

// // // I'm not sure this is necessary. Sometimes the model obeys the instruction to omit the ```mdx and ``` lines.
// async function* RemoveMDXLines({ children }: { children: AI.Node }, { render }: AI.ComponentContext) {
//   yield '';
//   const frames = render(children);
//   for await (const frame of frames) {
//     yield removeMdxCodeBlockBoundaries(frame);
//   }
//   // const finalResult = await frames;
//   // return finalResult.replace(/```mdx | ```/g, '\n');
// }

// function App() {
//   return (
//     // @ts-expect-error
//     <RemoveMDXLines>
//       <MdxAgent />
//       {/* If we just have a raw string, the entire program outputs the empty string. I'm not sure why. */}
//       {/* prefix
//     ```mdx foo bar ```
//     suffix */}
//     </RemoveMDXLines>
//   );
// }

// async function MdxAgent() {
//   const buildingBlocksContent = fs.readFile(
//     path.join(packageRoot, 'packages/nextjs-demo/src/components/BuildingBlocks.tsx'),
//     'utf-8'
//   );
//   const mdxDocsRequest = await fetch(
//     'https://raw.githubusercontent.com/mdx-js/mdx/main/docs/docs/what-is-mdx.server.mdx'
//   );
//   return (
//     <ChatProvider component={OpenAIChatModel} model="gpt-4">
//       <ChatCompletion>
//         {/* prettier-ignore */}
//         <SystemMessage>You are an assistant who can use React components to work with the user. All your responses should be in MDX, which is Markdown For the Component Era. Here are instructions for how to use MDX:

//         === Begin instructions
//           {await mdxDocsRequest.text()}
//         === End instructions

//         However, there are some special MDX instructions for you:
//         1. Do not include import statements. Everything you need will be in scope automatically.
//         1. Do not include a starting ```mdx and closing ``` line. Just respond with the MDX itself.
//         1. Do not use MDX expressions (e.g. "Result of addition: {1 + 1}").
//         1. If you have a form, don't explicitly explain what the form does – it should be self-evident. Don't say something like "the submit button will save your entry".
//         1. Don't say anything to the user about MDX. Don't say "I am using MDX" or "I am using React" or "here's an MDX form".
//         1. If you're making a form, use the props on the form itself to explain what the fields mean / provide guidance. This is preferable to writing out separate prose. Don't include separate instructions on how to use the form if you can avoid it.

//         Here is the source code for the components you can use:
//         === Begin source code
//         {await buildingBlocksContent}
//         === End source code

//         For example, to display data for an entity, use a Card component.
//       </SystemMessage>
//         <UserMessage>
//           Invent a short JSON shape for a character in a fantasy game. First, show me an example (as raw JSON). Next,
//           show me a form that I can use to make my own instance of this JSON.
//         </UserMessage>
//       </ChatCompletion>
//     </ChatProvider>
//   );
// }

// const useInspector = false;

// // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
// if (useInspector) {
//   showInspector(<MdxAgent />);
// } else {
//   let lastValue = '';
//   const rendering = AI.createRenderContext().render(<App />, { appendOnly: true });
//   for await (const frame of rendering) {
//     process.stdout.write(frame.slice(lastValue.length));
//     lastValue = frame;
//   }

//   const finalResult = await rendering;
//   process.stdout.write(finalResult.slice(lastValue.length));
// }
