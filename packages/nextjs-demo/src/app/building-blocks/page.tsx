import InputPrompt from '@/components/InputPrompt';
import ResultContainer from '@/components/ResultContainer';
import {BuildingBlocks} from '@/components/BuildingBlocksGenerator';

export default function RecipeExample({ searchParams }: { searchParams: any }) {
  const defaultValue = 'Chicken Tikka Masala';
  const query = searchParams.q ?? defaultValue;
  return (
    <>
      <ResultContainer
        title="Building Blocks"
        description="In this demo, the AI can use building block UI components"
      >
        <InputPrompt label="Ask me anything..." defaultValue={query} />
        <BuildingBlocks topic={query} />
      </ResultContainer>
    </>
  );
}
