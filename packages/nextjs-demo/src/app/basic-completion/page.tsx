import InputPrompt from '@/components/InputPrompt';
import ResultContainer from '@/components/ResultContainer';
import { PoemAndFacts } from '@/components/PoemAndFacts';

export default function BasicCompletion({ searchParams }: { searchParams: any }) {
  const defaultValue = 'A fox who likes to program in JavaScript';
  const query = searchParams.q ?? defaultValue;
  return (
    <>
      <ResultContainer
        title="Basic Completion"
        description="In this demo, you can give the AI a topic and it will asynchronously generate a poem as well as a list of facts."
      >
        <InputPrompt label="Give me a topic..." defaultValue={query} />
        <PoemAndFacts topic={query} />
      </ResultContainer>
    </>
  );
}
