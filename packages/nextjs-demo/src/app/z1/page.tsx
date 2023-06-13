// @ts-nocheck

import React from '../react';
import { AI } from '../ai';
import ResultContainer from '@/components/ResultContainer';
import HealthAgent from 'examples/dist/bakeoff/health-agent/agent';

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

export default function SleepAdvisor() {

  return (
    <>
    {
      questionsFromLarry.map(query => <ResultContainer title={`AI answers this sleep question: "${query}"`}>
      <AI renderDirectlyIntoDOM={true}>
        <HealthAgent query={query} />
      </AI>
    </ResultContainer>)
    }
    </>
  );
}
