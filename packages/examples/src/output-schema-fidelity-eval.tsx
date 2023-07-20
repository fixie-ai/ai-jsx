import * as AI from 'ai-jsx';
import pLimit from 'p-limit';
import fs from 'node:fs/promises';
import { OpenAI } from 'ai-jsx/lib/openai';
import { Anthropic } from 'ai-jsx/lib/anthropic';
import { z } from 'zod';
import { JsonChatCompletion } from 'ai-jsx/batteries/constrained-output';
import { UserMessage } from 'ai-jsx/core/completion';
import _ from 'lodash';
import { pino } from 'pino';
import { PinoLogger } from 'ai-jsx/core/log';
import { Jsonifiable } from 'type-fest';

const testCaseCount = 10;
const concurrencyLimit = 10;
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
  name: string;
  component: AI.Element<any>;
  validate: (output: string) => Jsonifiable;
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

const testCases: TestCase[] = [simpleJson];

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
  await limit(async () => {
    logger.debug({ testCaseIndex: index }, 'Running testCase');
    const output = await render(testCase.component);
    const validatedOutput = testCase.validate(output);
    const outputLine = JSON.stringify({
      testCase: testCase.name,
      index,
      validationResult: validatedOutput,
      generatedOutput: testCase.formatOutput ? testCase.formatOutput(output) : output,
    });
    await resultFileHandle.write(`${outputLine}\n`);
    logger.debug({ testCaseIndex: index }, 'Finished');
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
      <OpenAI chatModel="gpt-3.5-turbo">{testCaseComponents}</OpenAI>
      <Anthropic chatModel="claude-1.3">{testCaseComponents}</Anthropic>
    </>
  );
}

function RunTestCases({ testCases }: { testCases: TestCase[] }) {
  return testCases.map((testCase) => <RunTestCase testCase={testCase} />);
}

await AI.createRenderContext({ logger: new PinoLogger() }).render(<RunTestCases testCases={testCases} />);
logger.info({ testCaseCount }, 'All testCases complete');
