import * as AI from 'ai-jsx';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';
import { Prompt } from 'ai-jsx/batteries/prompts';
import { ImageGen } from 'ai-jsx/core/image-gen';

function RecipeWithImage(_: {}, { memo }: AI.ComponentContext) {
  const recipeTitle = memo(
    <ChatCompletion temperature={1}>
      <Prompt persona="a Michelin Star Head Chef" />
      <UserMessage>Come up with a title for an exotic sushi.</UserMessage>
    </ChatCompletion>
  );
  return (
    <>
      Recipe title: {recipeTitle}
      {'\n'}
      Recipe image link: <ImageGen>Sushi called "{recipeTitle}"</ImageGen>
    </>
  );
}

console.log(await AI.createRenderContext().render(<RecipeWithImage />));
