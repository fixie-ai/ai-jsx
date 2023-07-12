/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/react';
import { UICompletion } from 'ai-jsx/react/completion';
import { useState, ReactNode } from 'react';
import { Prompt } from 'ai-jsx/batteries/prompts';
import { ImageGen as BaseImageGen, ImageGenPropsWithChildren } from 'ai-jsx/core/image-gen';
import ResultContainer from '../ResultContainer.tsx';
import InputPrompt from '../InputPrompt.tsx';
import { atom, useAtom } from 'jotai';

const selectedIngredientsAtom = atom(new Set<any>());

export function Recipe({ children }: { children?: ReactNode }) {
  return <div data-test="recipe">{children}</div>;
}

export function RecipeTitle({ children }: { children?: ReactNode }) {
  return (
    <h2 className="text-xl font-bold" data-test="recipe-title">
      {children}
    </h2>
  );
}

export function RecipeInstructionList({ children }: { children?: ReactNode }) {
  return (
    <div className="mt-4">
      <h2 className="font-bold">Instructions</h2>
      <ol className="list-inside list-disc" data-test="recipe-instruction-list">
        {children}
      </ol>
    </div>
  );
}

export function RecipeIngredientList({ children }: { children?: ReactNode }) {
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

export function RecipeIngredientListItem({ children }: { children?: ReactNode }) {
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
export function RecipeInstructionListItem({ children }: { children?: ReactNode }) {
  return <li data-test="recipe-instruction-list-item">{children}</li>;
}

export function ImageGen(props: ImageGenPropsWithChildren) {
  return <BaseImageGen size="256x256" {...props} />;
}

export default function RecipeWrapper() {
  const [query, setQuery] = useState('braised lamb stew');

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
            reactComponentsDoc={
              <>
                <Recipe />: The container component for all other elements of the recipe.
                {'\n'}
                <RecipeTitle />: The title of the recipe.
                {'\n'}
                <RecipeIngredientList />: The list of ingredients. It should contain a list of RecipeIngredientListItem
                elements.
                {'\n'}
                <RecipeIngredientListItem />: An item in the list of ingredients
                {'\n'}
                <RecipeInstructionList />: The list of instructions. It should contain a list of
                RecipeInstructionListItem elements.
                {'\n'}
                <RecipeInstructionListItem />: An item in the list of instructions.
                {'\n'}
              </>
            }
            aiComponentsDoc={
              <>
                <ImageGen />: A special component that will generate an image for you. All you need to do is to provide
                a prompt that describes the image you want. The prompt should be descriptive enough to generate an image
                that is relevant to the recipe.
              </>
            }
          >
            <Prompt persona="a Michelin Star Head Chef" />
            Give me a recipe for {query}.{'\n'}
            Make sure to include an image of the dish at the top.
          </UICompletion>
        </AI.jsx>
      </ResultContainer>
    </>
  );
}
