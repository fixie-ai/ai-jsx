import * as LLMx from '@fixieai/ai-jsx';
import { stringify as csvStringify } from 'csv-stringify/sync';
import { showInspector } from '@fixieai/ai-jsx/core/inspector';
// This errors due to an ESM issue. I don't know what the right way to fix it is.
// @ts-expect-error
import HealthAgent from './agent';

// https://github.com/fixie-ai/Zhealth/blob/main/test_zhealth.ipynb
const questionsFromLarry: string[] = [
  'What can you do?',
  'Can you tell me my average Sleep Onset Duration? And, show me a table of my sleep data',
  'What is my average sleep efficiency (100% * (time asleep/total time in bed))',
  'How well am I sleeping?',
  'Do I have any sleep issues that I should be concerned about?',
  'Show me my sleep data as an HTML table',
  'What advice can you give me to improve my sleep?',
  'What day did I sleep the most last week, and the least?',
];

const queryList = [...questionsFromLarry, 'What time is it in Mumbai?'];

function AskAndAnswer({ query }: { query: string }) {
  return (
    <>
      {query}
      {'\n'}
      <HealthAgent query={query} />
      {'\n'}
      {'\n'}
    </>
  );
}

if (process.env.BULK_EVAL) {
  const results = [];
  for (const query of queryList) {
    const startTime = Date.now();
    const answer = await LLMx.createRenderContext().render(<HealthAgent query={query} />);
    const endTime = Date.now();
    results.push({
      query,
      answer,
      durationMs: endTime - startTime,
    });
  }
  console.log(csvStringify(results, { header: true }));
} else {
  showInspector(
    <>
      {queryList.map((query) => (
        <AskAndAnswer query={query} />
      ))}
    </>,
    { showDebugTree: true }
  );
}
