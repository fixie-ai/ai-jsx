// @ts-nocheck

import React from '../react';
import { AIComponent } from '../ai';
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
        <AIComponent>
          <ChatCompletion temperature={1}>
            <UserMessage>Write me a poem about {query}</UserMessage>
          </ChatCompletion>
        </AIComponent>
      </ResultContainer>
      <ResultContainer title={`AI lists ten facts about ${query}`}>
        <AIComponent>
          <ChatCompletion temperature={1}>
            <UserMessage>Give me ten facts about {query}</UserMessage>
          </ChatCompletion>
        </AIComponent>
      </ResultContainer>
    </>
  );
}
