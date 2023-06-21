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

export function Banner({ children }: { children: string }) {
  return <img src={children} data-test="recipe-image" />;
}

export default function RecipeWrapper() {
  const [query, setQuery] = useState('beans');

  const recipeSummary = memo(
    <ChatCompletion temperature={1}>
      <Prompt persona="a Michelin Star Head Chef" />
      <UserMessage>Give me a recipe for {query}.</UserMessage>
    </ChatCompletion>
  );

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
          <UICompletion
            example={
              <Recipe>
                <Banner>https://...</Banner>
                <RecipeTitle>Crème Chantilly</RecipeTitle>
                <RecipeIngredientList>
                  <RecipeIngredientListItem>2 cups heavy cream</RecipeIngredientListItem>
                  <RecipeIngredientListItem>2 tablespoons granulated sugar</RecipeIngredientListItem>
                  <RecipeIngredientListItem>1 teaspoon vanilla extract</RecipeIngredientListItem>
                </RecipeIngredientList>
                <RecipeInstructionList>
                  <RecipeInstructionListItem>Combine the ingredients in a large mixing bowl.</RecipeInstructionListItem>
                  <RecipeInstructionListItem>
                    Beat the contents on high speed until soft peaks form.
                  </RecipeInstructionListItem>
                  <RecipeIngredientListItem>Keep chilled until serving.</RecipeIngredientListItem>
                </RecipeInstructionList>
              </Recipe>
            }
          >
            <ChatCompletion>
              <UserMessage>Give me a recipe for {query}.</UserMessage>
            </ChatCompletion>
            {'\n'}
            Now here's a link to the banner URL for the recipe:{' '}
            <ImageGen>
              Generate an image for a recipe name
              <ChatCompletion>
                <UserMessage>
                  In two to three sentences, describe how the following recipe would look like when prepared by a chef:
                  {recipeSummary}
                </UserMessage>
              </ChatCompletion>
            </ImageGen>
          </UICompletion>
        </AI.jsx>
      </ResultContainer>
    </>
  );
}
