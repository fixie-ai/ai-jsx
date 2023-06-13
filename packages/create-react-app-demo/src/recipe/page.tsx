// @ts-nocheck
import React from '../react.ts';
import { useState } from 'react';
import { AI } from '../ai.tsx';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import ResultContainer from '../ResultContainer.tsx';
import InputPrompt from '../InputPrompt.tsx';
import { atom, useAtom } from 'jotai';

const selectedIngredientsAtom = atom<Set<string>>(new Set());

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
      <ol className="list-inside list-disc" data-test="recipe-instruction-list">
        {children}
      </ol>
    </div>
  );
}

export function RecipeIngredientList({ children }: { children: React.ReactNode }) {
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

export function RecipeIngredientListItem({ children }: { children: React.ReactNode }) {
  const [, setSelectedIngredients] = useAtom(selectedIngredientsAtom);

  function toggleItemSelected() {
    setSelectedIngredients((selectedIngredients) => {
      if (selectedIngredients.has(children)) {
        const newSelectedIngredients = new Set(selectedIngredients);
        newSelectedIngredients.delete(children);
        return newSelectedIngredients;
      }
      return new Set([...selectedIngredients, children]);
    });
  }

  return (
    <li data-test="recipe-ingredient-list-item">
      <input type="checkbox" className="mr-2" onClick={toggleItemSelected} />
      {children}
    </li>
  );
}
export function RecipeInstructionListItem({ children }: { children: React.ReactNode }) {
  return <li data-test="recipe-instruction-list-item">{children}</li>;
}

export default function RecipeWrapper() {
  const [query, setQuery] = useState('beans');

  return (
    <>
      <InputPrompt label="What would you like a recipe for?" value={query} setValue={setQuery} />

      <ResultContainer title={`AI comes up with a recipe for ${query}`}>
        <AI renderPassedReactComponents>
          <ChatCompletion temperature={1}>
            <SystemMessage>
              You are an AI who is an expert chef and also an expert UI designer. The user will ask you for a recipe.
              Your response must be structured using a set of React components. Here are the React components, and an
              example of how they should be used:
              <Recipe>the entire recipe contents</Recipe>
              <RecipeTitle>the title of your recipe</RecipeTitle>
              <RecipeInstructionList>
                <RecipeInstructionListItem>the first instruction</RecipeInstructionListItem>
              </RecipeInstructionList>
              <RecipeIngredientList>
                <RecipeIngredientListItem>the first ingredient</RecipeIngredientListItem>
              </RecipeIngredientList>
              Every child of a RecipeInstructionList should be a RecipeInstructionListItem. Every child of a
              RecipeIngredientList should be a RecipeIngredientListItem. Respond with a JSON object that encodes your
              UI. The JSON object should match this TypeScript interface: interface Element {'{'}
              name: string; children: (string | Element)[]
              {'}'}
              For example:
              {'{'}
              "name": "Recipe", "children": [{'{'}"name": "RecipeTitle", "children": ["My Recipe"]{'}'}
              "my description" ]{'}'}. Respond with only the JSON. Do not include with an explanatory suffix or prefix.
            </SystemMessage>
            <UserMessage>Give me a recipe for {query}. Respond with only the JSON.</UserMessage>
          </ChatCompletion>
        </AI>
      </ResultContainer>
    </>
  );
}
