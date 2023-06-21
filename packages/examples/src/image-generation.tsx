import * as AI from 'ai-jsx';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';
import { Prompt } from 'ai-jsx/batteries/prompts';
import { ImageGen } from 'ai-jsx/core/image-gen';
import { memo } from 'ai-jsx/core/memoize';
// import { showInspector } from 'ai-jsx/core/inspector';

function RecipeWithImage() {
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
      Recipe image link: <ImageGen>{recipeTitle}</ImageGen>
    </>
  );
}

// This doesn't look great for some reason.
// showInspector(<RecipeWithImage />);

console.log(await AI.createRenderContext().render(<RecipeWithImage />));
