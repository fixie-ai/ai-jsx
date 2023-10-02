/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/experimental/next';
import React, { Suspense } from 'react';
import { UICompletion } from 'ai-jsx/react/completion';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { ImageGen } from 'ai-jsx/core/image-gen';
import ResultContainer from '@/components/ResultContainer';
import InputPrompt from '@/components/InputPrompt';

export function Recipe({ children }: { children: React.ReactNode }) {
  return <div data-test="recipe">{children}</div>;
}

export function RecipeTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold" data-test="recipe-title">
      {children}
    </h2>
  );
}

export function RecipeInstructionList({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h2>Instructions</h2>
      <ol className="list-disc list-inside" data-test="recipe-instruction-list">
        {children}
      </ol>
    </div>
  );
}

export function RecipeIngredientList({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h2 className="italics">Ingredients</h2>
      <ul className="list-disc list-inside italic" data-test="recipe-ingredient-list">
        {children}
      </ul>
      <SelectIngredientsButton />
    </div>
  );
}

export function SelectIngredientsButton() {
  return (
    <button
      data-test="select-ingredients-button"
      className="mt-2 rounded bg-fixie-fresh-salmon px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-fixie-ripe-salmon focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon"
    >
      Add selected ingredients to shopping list
    </button>
  );
}

export function RecipeIngredientListItem({ children }: { children: React.ReactNode }) {
  return (
    <li data-test="recipe-ingredient-list-item">
      <input type="checkbox" className="mr-2" />
      {children}
    </li>
  );
}
export function RecipeInstructionListItem({ children }: { children: React.ReactNode }) {
  return <li data-test="recipe-instruction-list-item">{children}</li>;
}

function RecipeAI({ query }: { query: string }, { memo }: AI.ComponentContext) {
  const recipe = memo(
    <ChatCompletion temperature={1}>
      <SystemMessage>
          You are a Michelin Star Head Chef
      </SystemMessage>
      <UserMessage>Give me a recipe for {query}.</UserMessage>
    </ChatCompletion>
  );

  return (
    <>
      <ImageGen size="256x256">
        Generate an image for the following dish:
        <ChatCompletion>
          <UserMessage>
            In two to three sentences, describe how the following recipe would look like when prepared by a chef:
            {recipe}
          </UserMessage>
        </ChatCompletion>
      </ImageGen>
      <UICompletion
        example={
          <Recipe>
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
        {recipe}
      </UICompletion>
    </>
  );
}

export default function RecipeWrapper({ searchParams }: { searchParams: any }) {
  const defaultValue = 'braised lamb stew';
  const query = searchParams.q ?? defaultValue;

  return (
    <>
      <InputPrompt label="What would you like a recipe for?" defaultValue={defaultValue} />

      <ResultContainer title={`AI comes up with a recipe for "${query}"`}>
        <Suspense fallback={'Loading...'}>
          <AI.JSX>
            <RecipeAI query={query} />
          </AI.JSX>
        </Suspense>
      </ResultContainer>
    </>
  );
}
