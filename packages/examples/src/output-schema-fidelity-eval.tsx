import * as AI from 'ai-jsx';
import pLimit from 'p-limit';
import fs from 'node:fs/promises';
import { ValidChatModel as OpenAIModel } from 'ai-jsx/lib/openai';
import { ValidChatModel as AnthropicModel } from 'ai-jsx/lib/anthropic';
import { z } from 'zod';
import { JsonChatCompletion } from 'ai-jsx/batteries/constrained-output';
import { UserMessage } from 'ai-jsx/core/completion';
import _ from 'lodash';
import { pino } from 'pino';
import { PinoLogger } from 'ai-jsx/core/log';

const trialCount = 10;
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

interface Trial {
  name: string;
  component: AI.Element<any>;
  validate: (output: string) => string;
}

// const models = [<OpenAI chatModel="gpt-4" />];

const simpleJsonSchema = z.object({
  name: z.string(),
  age: z.number(),
});
const simpleJson: Trial = {
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
      return e.message;
    }
    return null;
  },
};

const trials: Trial[] = [simpleJson];

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

function promisesForTrial(trial: Trial) {
  _.range(trialCount).map((index) =>
    limit(async () => {
      logger.debug({ trialIndex: index }, 'Running trial');
      const output = await AI.createRenderContext({ logger: new PinoLogger(logger) }).render(trial.component);
      const validatedOutput = trial.validate(output);
      const outputLine = JSON.stringify({
        trial: trial.name,
        index,
        validationResult: validatedOutput,
        generatedOutput: output,
      });
      await resultFileHandle.write(`${outputLine}\n`);
      logger.debug({ trialIndex: index }, 'Finished');
    })
  );
}

await Promise.all(trials.flatMap(promisesForTrial));
logger.info({ trialCount }, 'All trials complete');
