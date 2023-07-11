/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/react';
import { UICompletion } from 'ai-jsx/react/completion';
import { useState, ReactNode } from 'react';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';
import { memo } from 'ai-jsx/core/memoize';
import { Prompt } from 'ai-jsx/batteries/prompts';
import { ImageGen } from 'ai-jsx/core/image-gen';
import ResultContainer from '../ResultContainer.tsx';
import InputPrompt from '../InputPrompt.tsx';
import { atom, useAtom } from 'jotai';

const selectedIngredientsAtom = atom(new Set<any>());

export function Recipe({ children }: { children: ReactNode }) {
  return <div data-test="recipe">{children}</div>;
}

export function RecipeTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xl font-bold" data-test="recipe-title">
      {children}
    </h2>
  );
}

export function RecipeInstructionList({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4">
      <h2 className="font-bold">Instructions</h2>
      <ol className="list-inside list-disc" data-test="recipe-instruction-list">
        {children}
      </ol>
    </div>
  );
}

export function RecipeIngredientList({ children }: { children: ReactNode }) {
  const [selectedIngredients] = useAtom(selectedIngredientsAtom);
  return (
    <div>
      <h2 className="font-bold">Ingredients</h2>
      <ul className="list-inside list-disc italic" data-test="recipe-ingredient-list">
        {children}
      </ul>
      <div>{selectedIngredients.size} items selected.</div>
    </div>
  );
}

export function RecipeIngredientListItem({ children }: { children: ReactNode }) {
  const [, setSelectedIngredients] = useAtom(selectedIngredientsAtom);

  function toggleItemSelected() {
    setSelectedIngredients((selectedIngredients) => {
      if (selectedIngredients.has(children)) {
        const newSelectedIngredients = new Set(selectedIngredients);
        newSelectedIngredients.delete(children);
        return newSelectedIngredients;
      }
      return new Set([...Array.from(selectedIngredients), children]);
    });
  }

  return (
    <li data-test="recipe-ingredient-list-item">
      <input type="checkbox" className="mr-2" onClick={toggleItemSelected} />
      {children}
    </li>
  );
}
export function RecipeInstructionListItem({ children }: { children: ReactNode }) {
  return <li data-test="recipe-instruction-list-item">{children}</li>;
}

export function Header({ children }: { children: ReactNode }) {
  return <h1 className="mt-2">{children}</h1>;
}
export function Paragraph({ children }: { children: ReactNode }) {
  return <p className="mt-2">{children}</p>;
}

export function Container({ children }: { children: ReactNode }) {
  return <div className="mt-4">{children}</div>;
}

export default function RecipeWrapper() {
  const [query, setQuery] = useState('braised lamb stew');

  const recipe = memo(
    <ChatCompletion temperature={1}>
      <Prompt persona="a fantasy fiction writer" />
      <UserMessage>
        Give me a story about 3 children named Ralph, Rudolph, and Rita. Make sure to give it an interesting title.
      </UserMessage>
    </ChatCompletion>
  );
  // const recipe = 'dummy';

  return (
    <>
      <ResultContainer
        title="Recipe Maker"
        description="In this demo, you can give the AI a food item and it will generate a recipe on-the-fly with a custom user interface."
      >
        <InputPrompt label="What would you like a recipe for?" value={query} setValue={setQuery} />
      </ResultContainer>
      <ResultContainer title={`AI comes up with a recipe for "${query}"`}>
        <AI.jsx>
          {/* <ImageGen size="256x256">
            <ChatCompletion>
              <UserMessage>
                In two to three sentences, describe how the following recipe would look like when prepared by a chef:
                {recipe}
              </UserMessage>
            </ChatCompletion>
          </ImageGen> */}
          <UICompletion
            aiComponents={[ImageGen]}
            example={
              <Container>
                <Header>Adventure in the Dark</Header>
                <ImageGen>2 people in a dark forest. The lights of a cabin can be seen from afar.</ImageGen>
                <Paragraph>Jimmy and Minny step out of the castle when all ....</Paragraph>
                <Paragraph>They knock and a the door slides open with an alarming sound.</Paragraph>
                <ImageGen>
                  Creepy cabin in the woods at night, the door is slightly open but nothing since it's dark.
                </ImageGen>
                ...
              </Container>
              // <Recipe>
              //   <RecipeTitle>Crème Chantilly</RecipeTitle>
              //   <ImageGen>
              //     Crème Chantilly (a sweetened whipped cream with added flavoring) decorated with raspberries
              //   </ImageGen>
              //   <RecipeIngredientList>
              //     <RecipeIngredientListItem>2 cups heavy cream</RecipeIngredientListItem>
              //     <RecipeIngredientListItem>2 tablespoons granulated sugar</RecipeIngredientListItem>
              //     <RecipeIngredientListItem>1 teaspoon vanilla extract</RecipeIngredientListItem>
              //   </RecipeIngredientList>
              //   <RecipeInstructionList>
              //     <RecipeInstructionListItem>Combine the ingredients in a large mixing bowl.</RecipeInstructionListItem>
              //     <RecipeInstructionListItem>
              //       Beat the contents on high speed until soft peaks form.
              //     </RecipeInstructionListItem>
              //     <RecipeIngredientListItem>Keep chilled until serving.</RecipeIngredientListItem>
              //   </RecipeInstructionList>
              // </Recipe>
            }
          >
            {recipe}
            {'\n'}
            Make sure to generate images of the story in between paragraphs to make it more interesting.
          </UICompletion>
        </AI.jsx>
      </ResultContainer>
    </>
  );
}
