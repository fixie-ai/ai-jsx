import * as AI from 'ai-jsx';
import pLimit from 'p-limit';
import fs from 'node:fs/promises';
import { OpenAI } from 'ai-jsx/lib/openai';
// import { Anthropic } from 'ai-jsx/lib/anthropic';
import { z } from 'zod';
import { JsonChatCompletion } from 'ai-jsx/batteries/constrained-output';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import _ from 'lodash';
import { pino } from 'pino';
import { PinoLogger } from 'ai-jsx/core/log';
import { Jsonifiable } from 'type-fest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Prompt } from 'ai-jsx/batteries/prompts';
import GPT3Tokenizer from 'gpt3-tokenizer';
import fetch from 'node-fetch';
import { compileSync } from '@mdx-js/mdx';

/**
 * This is a mini-tool to help you evaluate whether a model is producing good output.
 *
 * For example, you might want to use this when you're trying to get the model to emit JSON matching a particular
 * schema. Given an AI.JSX component, you can run this test harness to analyze:
 *    * How often the output is valid
 *    * How long the generation takes
 *    * How many tokens the model produces
 *
 * Steps to use this:
 *
 * 1. Define your component:
 *    const myComponent = <JsonChatCompletion>Produce any JSON object</JsonChatCompletion>
 *
 * 2. Define a test case:
 *    const myTestCase: TestCase = {
 *      name: 'my-test-case',
 *      component: myComponent,
 *      validate: (output) => {
 *        try {
 *          JSON.parse(output)
 *        } catch (e: any) {
 *          return e.message;
 *        }
 *      }
 *    }
 *
 *  (You can perform as much logic as you want in validate() to ensure that the output is what you want, including
 *    using a JSON schema library like zod, or doing more model calls to ask a model to validate the output.)
 *
 * 3. Add your test case to the list of test cases:
 *    const testCases: TestCase[] = [myTestCase]
 *
 * 4. Generate the results:
 *    loglevel=info yarn workspace examples demo:output-schema-fidelity-eval:generate
 *
 * 4a. Optionally, change `testCaseCount` and `concurrencyLimit` variables in this script.
 *
 * This will create an output file in the current working directory called `output-schema-fidelity-eval.jsonl`.
 *
 * 5. Finally, analyze the results:
 *    loglevel=info yarn workspace examples demo:output-schema-fidelity-eval:analyze
 */

const testCaseCount = 25;
const concurrencyLimit = 3;
const limit = pLimit(concurrencyLimit);

const outputFile = 'output-schema-fidelity-eval.jsonl';
try {
  await fs.unlink(outputFile);
} catch (e: any) {
  if (e.code !== 'ENOENT') {
    throw e;
  }
}
const resultFileHandle = await fs.open(outputFile, 'a');

interface TestCase {
  /** The name of the test case */
  name: string;

  /** This component generates the output you're testing. */
  component: AI.Element<any>;

  /**
   * A function to validate your output. If it returns `undefined` or `null`, then the output is considered valid.
   * Any value the function returns will be written to the output file as a validation error.
   */
  validate: (output: string) => Jsonifiable;

  /**
   * A function to format your output for the results file. For instance, if your model returns a JSON string,
   * you may want to JSON.parse here so the output in the results file is more readable.
   *
   * If this function throws an error, the error will be logged and the raw output will be written to the result file
   * instead.
   */
  formatOutput?: (rawOutput: string) => Jsonifiable;
}

const simpleJsonSchema = z.object({
  name: z.string(),
  age: z.number(),
});
const simpleJson: TestCase = {
  name: 'simple-json',
  component: (
    <JsonChatCompletion schema={simpleJsonSchema}>
      <UserMessage>Create a JSON object</UserMessage>
    </JsonChatCompletion>
  ),
  validate: (output) => {
    try {
      simpleJsonSchema.parse(JSON.parse(output));
    } catch (e: any) {
      return JSON.parse(e.message);
    }
    return null;
  },
  formatOutput: JSON.parse,
};

// Hardcoded to match the exports of the building block files.
const allComponentNames = [
  'Button',
  'MarkdownWithoutImages',
  'IconButton',
  'Badge',
  'Card',
  'CardList',
  'InputWithLabel',
  'TextAreaInput',
  'SimpleRadioGroup',
  'Toggle',
  'CheckboxList',
  'ActionPanel',
  'StackedFormSection',
  'StackedForm',
  'ImageGen',
];
const Element: z.Schema = z.object({
  tag: z.string().refine((c) => allComponentNames.includes(c), {
    message: `Unknown component "tag". Supported components: ${allComponentNames}`,
  }),
  // The results will look better in the UI if the AI gives `props` back before `children`.
  // Also, make props optional.
  props: z.optional(z.record(z.any())),
  children: z.optional(z.union([z.string(), z.array(z.union([z.string(), z.lazy(() => Element)]))])),
});
const Elements = z.union([Element, z.array(Element)]);
const elementsWrapper = z.object({ root: Elements });

const currentPath = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentPath, '..', '..', '..', '..');
const reactComponentsDoc = fs.readFile(
  path.join(packageRoot, 'packages/create-react-app-demo/src/story-teller/BuildingBlocks.tsx'),
  'utf-8'
);
const aiComponentsDoc = fs.readFile(
  path.join(packageRoot, 'packages/create-react-app-demo/src/story-teller/AIBuildingBlocks.tsx'),
  'utf-8'
);

const storyPrompt = (
  <UserMessage>
    <Prompt persona="a fantasy fiction writer" />
    Give me a story about dogs on the moon. Make sure to give it an interesting title. The story should have 3-5
    chapters.
    {'\n'}
    Make sure to generate an image for each chapter to make it more interesting. In each chapter, use buttons to let the
    user flag inappropriate content. At the end, show a form to collect the user's feedback.
  </UserMessage>
);

const uiTestCase: TestCase = {
  name: 'ui-split-props',
  component: (
    <JsonChatCompletion schema={elementsWrapper}>
      {/* prettier-ignore */}
      <SystemMessage>
      You are an AI who is an expert UI designer. You can describe the UI as a nested JSON object. The JSON will be
        used to create a React/HTML UI tree. Each component is described using a "tag" name and a list of "children".
        Each child can be either a string or another component.
        {'For example <SomeComponent a="b" /> becomes { "tag": "SomeComponent", "props": {"a": "b"}, "children": [] }, and <Foo /> becomes {"tag": Foo", "children": []}'}
        {'\n'}
        The user will ask you a question and your job is to use the set of React components below to create a UI that
        the query asks for.
        {'\n'}
        Here's a list of the components that are available to you and their documentation:
        {'\n```txt filename="component_docs.txt"\n'}
        {await reactComponentsDoc}
        {'\n'}
        {await aiComponentsDoc}
        {'\n```\n'}

        {/* These instructions are not consistently followed. */}
        Do not use any elements (including HTML elements) other than the ones above. As such, the "tag" name of the
        component can only be one of the following: {allComponentNames.join(', ')}. Nothing else is
        permitted.
      </SystemMessage>
      {storyPrompt}
    </JsonChatCompletion>
  ),
  validate: (output) => {
    try {
      elementsWrapper.parse(JSON.parse(output));
    } catch (e: any) {
      return JSON.parse(e.message);
    }
  },
  formatOutput: JSON.parse,
};

const mdxDocsRequest = await fetch(
  'https://raw.githubusercontent.com/mdx-js/mdx/main/docs/docs/what-is-mdx.server.mdx'
);
const mdxDocsContent = await mdxDocsRequest.text();
/**
 * This produces a mixture of HTML and MDX, which is not what we want.
 */
async function MdxAgent() {
  return (
    <ChatCompletion>
      {/* prettier-ignore */}
      <SystemMessage>You are an assistant who can use React components to work with the user. All your responses should be in MDX, which is Markdown For the Component Era. Here are instructions for how to use MDX:

        === Begin instructions
        {mdxDocsContent}
        === End instructions

        However, there are some special MDX instructions for you:
        1. Do not include import statements. Everything you need will be in scope automatically.
        1. Do not include a starting ```mdx and closing ``` line. Just respond with the MDX itself.
        1. Do not use MDX expressions (e.g. "Result of addition: {1 + 1}").
        1. If you have a form, don't explicitly explain what the form does – it should be self-evident. Don't say something like "the submit button will save your entry".
        1. Don't say anything to the user about MDX. Don't say "I am using MDX" or "I am using React" or "here's an MDX form".
        1. If you're making a form, use the props on the form itself to explain what the fields mean / provide guidance. This is preferable to writing out separate prose. Don't include separate instructions on how to use the form if you can avoid it.
        1. Do not include any HTML elements. Only use the following React components: {allComponentNames.join(', ')}.
        1. Do not includes newlines unless strictly necessary for the markdown interpretation. For example, do not include newlines within a React component.

        Here is the source code for the components you can use:
        === Begin source code
        {/* Problem: this includes the markdownWithoutImages component, which is not what we want for MDX. */}
        {await reactComponentsDoc}
        === End source code

        Example output:
        {`
          # My MDX document
          <Card header='My card header content' footer='my footer content'>
            * List item 1
            * List item 2
            * List item 3
             
            \`\`\`
            // Code block
            foo.bar(); 
            \`\`\`
          </Card>

          Here is a paragraph <Badge color='blue'>with a badge</Badge> in it.
        `}
      </SystemMessage>
      {storyPrompt}
    </ChatCompletion>
  );
}

const mdxTestCase: TestCase = {
  name: 'mdx',
  component: <MdxAgent />,
  validate: (output) => {
    try {
      compileSync({
        path: 'test.mdx',
        value: output,
      });
    } catch (e: any) {
      return e.message;
    }
  },
};

const testCases: TestCase[] = [
  // simpleJson,
  // uiTestCase,
  mdxTestCase,
];

const logger = pino({
  name: 'ai-jsx',
  level: process.env.loglevel ?? 'trace',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

async function RunSingleTrial(
  { index, testCase }: { index: number; testCase: TestCase },
  { render, logger }: AI.ComponentContext
) {
  function getFormattedOutput(output: string) {
    if (testCase.formatOutput) {
      try {
        return testCase.formatOutput(output);
      } catch (e) {
        logger.warn({ testCaseIndex: index, e }, 'formatOutput threw an error');
        return output;
      }
    }
    return output;
  }

  await limit(async () => {
    logger.debug({ testCaseIndex: index }, 'Running testCase');

    const startTime = performance.now();

    async function writeOutput(row: Record<string, Jsonifiable>) {
      const outputLine = JSON.stringify({
        testCase: testCase.name,
        index,
        /**
         * This timing measurement is a little noisy because JS is async, so we don't know how much time was actually
         * spent processing this case versus waiting for CPU etc. However, I think this noise will be immaterial
         * because the model latency is a much bigger factor.
         */
        durationMs: performance.now() - startTime,
        ...row,
      });
      await resultFileHandle.write(`${outputLine}\n`);
      logger.info({ testCaseIndex: index }, 'Finished');
    }

    try {
      const output = await render(testCase.component);

      // TODO: how can we figure out which model was used?

      const validatedOutput = testCase.validate(output);
      await writeOutput({
        originalOutputTokenCount: new GPT3Tokenizer.default({ type: 'gpt3' }).encode(output).bpe.length,
        validationResult: validatedOutput ?? null,
        generatedOutput: getFormattedOutput(output),
      });
    } catch (e: any) {
      await writeOutput({
        error: e.message,
      });
    }
  });
  return '';
}

function RunTestCase({ testCase }: { testCase: TestCase }) {
  const testCaseComponents = _.range(testCaseCount).map((index) => (
    <RunSingleTrial index={index} testCase={testCase} />
  ));

  return (
    <>
      <OpenAI chatModel="gpt-4">{testCaseComponents}</OpenAI>
      {/* <OpenAI chatModel="gpt-3.5-turbo">{testCaseComponents}</OpenAI> */}
      {/* <Anthropic chatModel="claude-1.3">{testCaseComponents}</Anthropic> */}
    </>
  );
}

function RunTestCases({ testCases }: { testCases: TestCase[] }) {
  return testCases.map((testCase) => <RunTestCase testCase={testCase} />);
}

await AI.createRenderContext({ logger: new PinoLogger(logger) }).render(<RunTestCases testCases={testCases} />);
logger.info({ testCaseCount }, 'All testCases complete');
