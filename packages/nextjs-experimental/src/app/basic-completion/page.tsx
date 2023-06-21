/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/experimental/next';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';
import InputPrompt from '@/components/InputPrompt';
import ResultContainer from '@/components/ResultContainer';

export default function BasicCompletion({ searchParams }: { searchParams: any }) {
  const defaultValue = 'wild weasels';
  const query = searchParams.q ?? defaultValue;
  return (
    <ResultContainer
      title="Basic Completion"
      description="In this demo, you can give the AI a topic and it will asynchronously generate a poem as well as a list of facts."
    >
      <InputPrompt label="Give me a topic..." defaultValue={defaultValue} />
      <ResultContainer title={`AI writes a poem about "${query}"`}>
        <AI.jsx>
          <ChatCompletion temperature={1}>
            <UserMessage>Write me a poem about {query}</UserMessage>
          </ChatCompletion>
        </AI.jsx>
      </ResultContainer>
      <ResultContainer title={`AI lists ten facts about "${query}"`}>
        <AI.jsx>
          <ChatCompletion temperature={1}>
            <UserMessage>Give me ten facts about {query}</UserMessage>
          </ChatCompletion>
        </AI.jsx>
      </ResultContainer>
    </ResultContainer>
  );
}
