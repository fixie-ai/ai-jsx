// @ts-nocheck

import * as AI from 'ai-jsx/next';
import ResultContainer from '@/components/ResultContainer';
import InputPrompt from '@/components/InputPrompt';
import HealthAgent from 'examples/dist/bakeoff/health-agent/agent';

export default function Sleep({ searchParams }: { searchParams: any }) {
  const defaultValue = 'what can you do';
  const query = searchParams.q ?? defaultValue;

  return (
    <>
      <InputPrompt label="Ask a question about sleep" defaultValue={defaultValue} />

      <ResultContainer title={`AI answers this sleep question: "${query}"`}>
        <AI.jsx>
          <HealthAgent query={query} />
        </AI.jsx>
      </ResultContainer>
    </>
  );
}
