import InputPrompt from '@/components/InputPrompt';
import ResultContainer from '@/components/ResultContainer';
import { RecipeGenerator } from '@/components/Recipe';

export default function RecipeExample({ searchParams }: { searchParams: any }) {
  const defaultValue = 'Chicken Tikka Masala';
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
