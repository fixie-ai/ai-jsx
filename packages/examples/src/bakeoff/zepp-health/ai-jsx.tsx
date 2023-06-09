import * as LLMx from '@fixieai/ai-jsx';
import { stringify as csvStringify } from 'csv-stringify/sync';
import { showInspector } from '@fixieai/ai-jsx/core/inspector';
// This errors due to an ESM issue. I don't know what the right way to fix it is.
// @ts-expect-error
import ZeppHealth from './zepp';

// https://github.com/fixie-ai/Zhealth/blob/main/test_zhealth.ipynb
const questionsFromLarry: string[] = [
  'What can you do?',
  // 'What are your abilities?',
  // 'What is my average Sleep Onset Duration?',
  // 'Can you tell me my average Sleep Onset Duration?',
  // 'What are my SSO, SE, and ISI ratings?',
  // 'Can you please provide me with my SSO, SE, and ISI ratings?',
  // 'tell me about my sleep quality ratings',
  // 'Can you provide me with information about my sleep quality ratings?',
  // 'Am I sleeping well? And what advice can you give me to improve my sleep?',
  // 'Can you give me feedback on my sleeping pattern? What tips would you suggest to enhance my quality of sleep?',
  // 'Show me my sleep data as an HTML table',
  // 'Display my sleep data in an HTML table format.',
];

const queryList = [
  ...questionsFromLarry,
  // 'Please give me a recipe for cake',
  // 'What does anthrax taste like?',
  // 'What can you do?',
  // 'How can you help me?',
  // 'Can you provide me with information about my sleep quality ratings?',
  // "What's my ISI rating?",
  // "What's my SSO rating?",
  // "What's my SE rating?",
  // 'How can I get to sleep faster?',
  // 'Show me my sleep data as a markdown table',
  // 'Show me my sleep data as an HTML table',
  // 'Show me a histogram of how long it takes me to fall asleep',
  // 'Show me a pie chart of how long it takes me to fall asleep',
  // 'Show me a histogram of my sleep efficiency',
  // 'Show me a time series chart of how long it takes me to fall asleep',
  // 'Show me my sleep data as a chart in ASCII art table',
  // 'Show me a chart about my sleep data',
  "What's my DOESNOTEXIST rating?",
];

function AskAndAnswer({ query }: { query: string }) {
  return (
    <>
      {query}
      {'\n'}
      <ZeppHealth query={query} />
      {'\n'}
      {'\n'}
    </>
  );
}

if (process.env.BULK_EVAL) {
  const results = [];
  for (const query of queryList) {
    const startTime = Date.now();
    const answer = await LLMx.createRenderContext().render(<ZeppHealth query={query} />);
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
