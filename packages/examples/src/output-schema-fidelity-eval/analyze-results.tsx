import fs from 'fs';
import { MergeExclusive } from 'type-fest';
import _ from 'lodash';
import prettyMs from 'pretty-ms';
import traverse from 'traverse';

type Jsonifiable = any;

type ResultFileRow = {
  testCase: string;
  index: number;
  durationMs: number;
} & MergeExclusive<
  {
    validationResult: Jsonifiable;
    generatedOutput: Jsonifiable;
    originalOutputTokenCount: number;
  },
  {
    error: string;
  }
>;
function parseJsonlFile(filePath: string): ResultFileRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = _.compact(content.split('\n'));
  return lines.map((line) => JSON.parse(line));
}

// This should just be moved into the generate side.
function getValidationResultCategory(row: ResultFileRow) {
  const {validationResult} = row;
  // console.log(validationResult);
  if (!validationResult) {
    return 'valid';
  }
  if (validationResult?.[0]?.message.includes('Unknown component "tag"')) {
    return 'hallucinated a component';
  }
  let invalidChildrenField = false;
  traverse(row.generatedOutput).forEach(function (node) {
    if (this.key === 'children' && !(typeof node === 'string' || Array.isArray(node))) {
      invalidChildrenField = true;
      this.stop();
    }
  });
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (invalidChildrenField) {
    return 'invalid child field';
  }
  return 'unknown error type';
}

function calculateSummary(rows: ResultFileRow[]) {
  const sortedDurations = rows.map((row) => row.durationMs).sort((a, b) => a - b);
  const durationPercentile = (p: number) => {
    const index = Math.floor(sortedDurations.length * p);
    return sortedDurations[index];
  };

  const sortedOutputTokenCounts = rows
    .filter((row) => row.originalOutputTokenCount !== undefined)
    .map((row) => row.originalOutputTokenCount)
    .sort((a, b) => a! - b!);
  const outputTokenCountPercentile = (p: number) => {
    const index = Math.floor(sortedOutputTokenCounts.length * p);
    return sortedOutputTokenCounts[index];
  };

  const errorCount = rows.filter((row) => row.error !== undefined).length;
  const countRowsWithCorrectOutput = rows.filter((row) => row.validationResult === null).length;

  const validationResultLabels = _(rows)
    .reject({ validationResult: null })
    .reject('error')
    .map((row) => getValidationResultCategory(row))
    .value();

  const timings = {
    median: durationPercentile(0.5),
    p90: durationPercentile(0.9),
    p99: durationPercentile(0.99),
  };

  const countInvalidRows = rows.length - countRowsWithCorrectOutput;

  return {
    rowCount: rows.length,
    generatedOutputTokenCounts: {
      median: outputTokenCountPercentile(0.5),
      p90: outputTokenCountPercentile(0.9),
      p99: outputTokenCountPercentile(0.99),
    },
    timings,
    prettyTimings: _.mapValues(timings, (v) => prettyMs(v)),
    outcomePortions: {
      runtimeError: errorCount / rows.length,
      validOutput: countRowsWithCorrectOutput / rows.length,
      invalidOutput: countInvalidRows / rows.length,
    },
    validationResultPortions: _.mapValues(_.countBy(validationResultLabels), (count) => count / countInvalidRows),
  };
}

const filePath = 'output-schema-fidelity-eval.jsonl';
const rows = parseJsonlFile(filePath);
const summary = calculateSummary(rows);
console.log(summary);
