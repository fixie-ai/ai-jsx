// @ts-nocheck

import * as AI from 'ai-jsx/next';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';
import InputPrompt from '@/components/InputPrompt';
import ResultContainer from '@/components/ResultContainer';

export default function BasicCompletion({ searchParams }: { searchParams: any }) {
  const defaultValue = 'wild weasels';
  const query = searchParams.q ?? defaultValue;
  return (
    <>
      <InputPrompt label="Give the AI a topic" defaultValue={defaultValue} />
      <ResultContainer title={`AI writes a poem about ${query}`}>
        <AI.jsx>
          <ChatCompletion temperature={1}>
            <UserMessage>Write me a poem about {query}</UserMessage>
          </ChatCompletion>
        </AI.jsx>
      </ResultContainer>
      <ResultContainer title={`AI lists ten facts about ${query}`}>
        <AI.jsx>
          <ChatCompletion temperature={1}>
            <UserMessage>Give me ten facts about {query}</UserMessage>
          </ChatCompletion>
        </AI.jsx>
      </ResultContainer>
    </>
  );
}
