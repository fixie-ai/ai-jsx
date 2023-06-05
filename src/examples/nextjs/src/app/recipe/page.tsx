import React from '../react';
import { AI } from '../ai';
import { ChatCompletion, SystemMessage, UserMessage } from '../../../../../../dist/lib/completion-components.js';

function ResultContainer({
  title,
  children,
  description,
}: {
  title: string;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="p-4 m-4 w-full">
      <h1 className="text-lg font-bold">{title}</h1>
      {description && <p>{description}</p>}
      <div className="border-black border p-4 m-4 bg-white w-full">
        {/* <Suspense fallback={<Loading />}> */}
        {children}
        {/* </Suspense> */}
      </div>
    </div>
  );
}

export function Recipe({ children }: { children: React.ReactNode }) {
  return <div data-test='recipe'>{children}</div>;
}

export function RecipeTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold" data-test='recipe-title'>{children}</h2>;
}

export function RecipeInstructionList({ children }: { children: React.ReactNode }) {
  return <ol className="list-disc list-inside" data-test='recipe-instruction-list'>{children}</ol>;
}

export function RecipeIngredientList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc list-inside italic" data-test='recipe-ingredient-list'>{children}</ul>;
}

export function RecipeListItem({ children }: { children: React.ReactNode }) {
  return <li data-test='recipe-list-item'>{children}</li>;
}

export default async function Home() {
  return (
    <>
      <ResultContainer title="AI comes up with a recipe [beans]">
        <AI renderPassedReactComponents>
          <ChatCompletion temperature={1}>
            <SystemMessage>
              You are an AI who is an expert chef and also an expert UI designer. The user will ask you for a recipe.
              Your response must be structured using a set of React components. Here are the React components, and an
              example of how they should be used:
              <Recipe>the entire recipe contents</Recipe>
              <RecipeTitle>the title of your recipe</RecipeTitle>
              <RecipeInstructionList>
                <RecipeListItem>the first instruction</RecipeListItem>
              </RecipeInstructionList>
              <RecipeIngredientList>
                <RecipeListItem>the first ingredient</RecipeListItem>
              </RecipeIngredientList>

              In your response, any duration (e.g. "1 hour") should be wrapped in a DurationLabel component. Every child of a RecipeInstructionList should be a RecipeListItem.

              Respond with a JSON object that encodes your UI. The JSON object should match this TypeScript interface: interface Element {'{'}
                name: string;
                children: (string | Element)[]
              {'}'}

              For example:

              {'{'}
                "name": "Recipe",
                "children": [
                  {'{'}"name": "RecipeTitle", "children": ["My Recipe"]{'}'}
                  "my description"
                ]
              {'}'}
            </SystemMessage>
            <UserMessage>Give me a beans recipe. Respond with only the JSON.</UserMessage>
          </ChatCompletion>
        </AI>
      </ResultContainer>
    </>
  );
}
