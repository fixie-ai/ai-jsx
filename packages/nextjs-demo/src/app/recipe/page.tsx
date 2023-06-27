import InputPrompt from '@/components/InputPrompt';
import ResultContainer from '@/components/ResultContainer';
import { RecipeGenerator } from '@/components/Recipe';

export default function BasicCompletion({ searchParams }: { searchParams: any }) {
  const defaultValue = 'beans';
  const query = searchParams.q ?? defaultValue;
  return (
    <>
      <ResultContainer
        title="Recipe Example"
        description="In this demo, you can give the AI a topic and it will generate UI for a recipe."
      >
        <InputPrompt label="Give me a topic..." defaultValue={query} />
        <RecipeGenerator topic={query} />
      </ResultContainer>
    </>
  );
}
