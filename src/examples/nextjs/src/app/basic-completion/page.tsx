import React from '../react';
import { AI } from '../ai';
import { ChatCompletion, UserMessage } from '../../../../../../dist/lib/completion-components.js';
import InputPrompt from '@/components/InputPrompt';
import ResultContainer from '@/components/ResultContainer';

export default async function BasicCompletion({ searchParams }: { searchParams: any }) {
  const defaultValue = 'wild weasels'
  const query = searchParams.q ?? defaultValue;
  return (
    <>
      <InputPrompt label="Give the AI a topic" defaultValue={defaultValue} />
      <ResultContainer title={`AI writes a poem about ${query}`}>
        <AI>
          <ChatCompletion temperature={1}>
            <UserMessage>Write me a poem about {query}</UserMessage>
          </ChatCompletion>
        </AI>
      </ResultContainer>
      <ResultContainer title={`AI lists ten facts about ${query}`}>
        <AI>
          <ChatCompletion temperature={1}>
            <UserMessage>Give me ten facts about {query}</UserMessage>
          </ChatCompletion>
        </AI>
      </ResultContainer>
    </>
  );
}
