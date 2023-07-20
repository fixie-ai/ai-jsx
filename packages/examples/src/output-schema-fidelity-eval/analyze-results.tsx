import fs from 'fs';
import { MergeExclusive } from 'type-fest';
import _ from 'lodash';
import prettyMs from 'pretty-ms';
import traverse from 'traverse';
import { count } from 'console';

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
  const { validationResult } = row;
  // console.log(validationResult);
  if (!validationResult) {
    return 'valid';
  }
  if (validationResult?.[0]?.message.includes('Unknown component "tag"')) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const allTags = traverse(row.generatedOutput).reduce(function (acc, node) {
      if (this.key === 'tag') {
        acc.add(node);
      }
      return acc;
    }, new Set());

    // console.log(allTags);

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
  if (_.isEqual(row.generatedOutput, {})) {
    return 'generated empty object';
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

  const [rowsWithErrors, rowsWithoutErrors] = _.partition(rows, 'error');

  const errorCount = rowsWithErrors.length;
  const countRowsWithCorrectOutput = rowsWithoutErrors.filter((row) => row.validationResult === null).length;

  const validationResultLabels = _(rowsWithoutErrors)
    .reject({ validationResult: null })
    .map((row) => getValidationResultCategory(row))
    .value();

  const timings = {
    median: durationPercentile(0.5),
    p90: durationPercentile(0.9),
    p99: durationPercentile(0.99),
  };

  const countInvalidRows = rowsWithoutErrors.length - countRowsWithCorrectOutput;
  const outcomeCounts = {
    noError: rowsWithoutErrors.length,
    runtimeError: errorCount,
    validOutput: countRowsWithCorrectOutput,
    invalidOutput: countInvalidRows,
  };

  const validationResultCounts = _.countBy(validationResultLabels);

  return {
    rowCount: rows.length,
    generatedOutputTokenCounts: {
      median: outputTokenCountPercentile(0.5),
      p90: outputTokenCountPercentile(0.9),
      p99: outputTokenCountPercentile(0.99),
    },
    timings,
    prettyTimings: _.mapValues(timings, (v) => prettyMs(v)),
    outcomeCounts,
    outcomePortions: _.mapValues(outcomeCounts, (count) => count / rows.length),
    validationResultCounts,
    validationResultPortions: _.mapValues(validationResultCounts, (count) => count / countInvalidRows),
  };
}

const filePath = 'output-schema-fidelity-eval.jsonl';
const rows = parseJsonlFile(filePath);
const summaries = _(rows)
  .groupBy('testCase')
  .mapValues((rowsForTestCase) => calculateSummary(rowsForTestCase))
  .value();

console.log(summaries);

rows.forEach((row) => {
  console.log(`==== ${row.testCase}:${row.index}`);
  console.log(row.generatedOutput);
  console.log();
});
