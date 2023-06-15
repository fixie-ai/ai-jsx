/** @jsx AI.createElement */
/** @jsxFrag AI.Fragment */
import * as AI from 'ai-jsx/react';
import { Serialize } from 'ai-jsx/react/serialize';
import React, { useState, ReactNode } from 'react';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
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

function reactComponentName(component: React.JSXElementConstructor<any> | string) {
  return typeof component === 'string' ? component : component.name;
}

async function UICompletion(
  {
    components,
    example,
    children,
  }: { components: (React.JSXElementConstructor<any> | string)[]; example: AI.Node; children: AI.Node },
  { render, logger }: AI.ComponentContext
) {
  if (components.length == 0) {
    throw new Error('UICompletion elements require at least one React component.');
  }
  const FirstComponent = components[0];

  const modelResult = await render(
    <ChatCompletion>
      <SystemMessage>
        You are an AI who is an expert UI designer. The user will provide content in the form of text and you will
        respond using a set of React components to create a UI for the content. Here are the only available React
        components and how they should be used:
        {'\n'}
        {example}
        {'\n'}
        Respond with a JSON object that encodes your UI. The JSON object should match this TypeScript interface:
        interface Element {'{'}
        name: string; children: (string | Element)[]
        {'}'}
        For example:{'\n'}
        <Serialize>
          <FirstComponent />
        </Serialize>
        Becomes: {'{'} "name": "{reactComponentName(FirstComponent)}", "children": []{'}'}. Respond with only the JSON.
        Do not include any explanatory prose. Do not use any elements (including HTML elements) other than the ones
        above.
      </SystemMessage>
      <UserMessage>{children}</UserMessage>
    </ChatCompletion>
  );

  const validComponents = Object.fromEntries(components.map((c) => [reactComponentName(c), c]));

  interface SerializedComponent {
    name: string;
    children: (string | SerializedComponent)[];
  }

  function toComponent(serializedComponent: SerializedComponent | string) {
    if (!serializedComponent || typeof serializedComponent === 'string') {
      return serializedComponent;
    }

    const Component = validComponents[serializedComponent.name];
    if (!Component) {
      logger.warn({ serializedComponent }, `Component not found for ${serializedComponent.name}`);
      return null;
    }

    if (!('children' in serializedComponent)) {
      throw new Error(`Unrecognized JSON: ${JSON.stringify(serializedComponent)}`);
    }

    // Sometimes the model returns a singleton string instead of an array.
    const children =
      typeof serializedComponent.children === 'string' ? [serializedComponent.children] : serializedComponent.children;

    return (
      <AI.React>
        <Component>{children.map(toComponent)}</Component>
      </AI.React>
    );
  }

  return toComponent(JSON.parse(modelResult));
}

export default function RecipeWrapper() {
  const [query, setQuery] = useState('beans');

  return (
    <>
      <InputPrompt label="What would you like a recipe for?" value={query} setValue={setQuery} />

      <ResultContainer title={`AI comes up with a recipe for ${query}`}>
        <AI.jsx>
          <UICompletion
            components={[
              Recipe,
              RecipeTitle,
              RecipeInstructionList,
              RecipeInstructionListItem,
              RecipeIngredientList,
              RecipeIngredientListItem,
            ]}
            example={
              <AI.React>
                <Recipe>
                  <RecipeTitle>Crème Chantilly</RecipeTitle>
                  <RecipeIngredientList>
                    <RecipeIngredientListItem>2 cups heavy cream</RecipeIngredientListItem>
                    <RecipeIngredientListItem>2 tablespoons granulated sugar</RecipeIngredientListItem>
                    <RecipeIngredientListItem>1 teaspoon vanilla extract</RecipeIngredientListItem>
                  </RecipeIngredientList>
                  <RecipeInstructionList>
                    <RecipeInstructionListItem>
                      Combine the ingredients in a large mixing bowl.
                    </RecipeInstructionListItem>
                    <RecipeInstructionListItem>
                      Beat the contents on high speed until soft peaks form.
                    </RecipeInstructionListItem>
                    <RecipeIngredientListItem>Keep chilled until serving.</RecipeIngredientListItem>
                  </RecipeInstructionList>
                </Recipe>
              </AI.React>
            }
          >
            <ChatCompletion>
              <UserMessage>Give me a recipe for {query}.</UserMessage>
            </ChatCompletion>
          </UICompletion>
        </AI.jsx>
      </ResultContainer>
    </>
  );
}
