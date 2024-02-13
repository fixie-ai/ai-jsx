import * as AI from 'ai-jsx';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { ImageGen } from 'ai-jsx/core/image-gen';

function RecipeWithImage(_: {}, { render }: AI.ComponentContext) {
  const recipeTitle = render(
    <ChatCompletion temperature={1}>
      <SystemMessage>You are a Michelin Star Head Chef</SystemMessage>
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

console.log(
  await AI.createRenderContext()
    .render(<RecipeWithImage />)
    .toStringAsync()
);
