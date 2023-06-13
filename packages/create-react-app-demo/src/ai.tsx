import * as LLMx from '@fixieai/ai-jsx';
import React from './react.ts';
import {useState} from 'react';
import { Suspense, ReactNode } from 'react';
import _ from 'lodash';
import {
  Recipe,
  RecipeIngredientList,
  RecipeInstructionList,
  RecipeIngredientListItem,
  RecipeInstructionListItem,
  RecipeTitle,
  SelectIngredientsButton,
} from './recipe/page.tsx';

function Loading() {
  return <img src="/loading.gif" width={100} height={100} alt="loading" />;
}

async function AIDirectToDOM({ children }: { children: ReactNode }) {
  const rendered = await LLMx.createRenderContext().render(children as LLMx.Renderable);
  return <div className="contents-generated-by-ai-buckle-up-buddy" dangerouslySetInnerHTML={{ __html: rendered }} />;
}

async function AIInterpretedReactComponents({ children }: { children: ReactNode }) {
  // TODO: Pull this automatically from the input that was passed.
  const possibleComponents = {
    Recipe,
    RecipeTitle,
    RecipeInstructionList,
    RecipeIngredientList,
    RecipeInstructionListItem,
    RecipeIngredientListItem,
    SelectIngredientsButton,
  };

  interface ExpectedJsonStructure {
    name: string;
    children: ExpectedJsonStructure[];
  }
  function parseJsonToReact(json?: ExpectedJsonStructure) {
    if (!json) {
      return null;
    }

    const Component = possibleComponents[json.name as keyof typeof possibleComponents] as
      | (typeof possibleComponents)[keyof typeof possibleComponents]
      | undefined;

    if (!Component) {
      console.warn(`Component not found for ${json.name}`);
      return null;
    }

    if (!('children' in json)) {
      throw new Error(`unrecognized JSON: ${JSON.stringify(json)}`);
    }

    // Sometimes the model returns a singleton string instead of an array.
    if (typeof json.children === 'string') {
      json.children = [json.children];
    }

    const children = json.children.map((child) => {
      if (typeof child === 'string') {
        return child;
      }
      return parseJsonToReact(child);
    });

    return <Component>{children}</Component>;
  }

  const rendered = await LLMx.createRenderContext().render(children as LLMx.Renderable);

  let modelResponseJSON;
  try {
    modelResponseJSON = JSON.parse(rendered);
  } catch (e) {
    throw new Error(`Failed to parse JSON from model response: ${rendered}`);
  }
  return parseJsonToReact(modelResponseJSON);
}

function AIStream({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState('');

  useEffect(() => {
    LLMx.createRenderContext()
      .render(children as LLMx.Renderable, {
        map: (frame) => {
          setResult(frame);
        },
      })
      .then((finalFrame) => {
        setResult(finalFrame);
      });
  });

  return result;
}


/**
 * A conversion layer between React and AI.JSX components.
 *
 * ```
 *    <ReactComponent>
 *      <AI>
 *        <ChatCompletion>...</ChatCompletion>
 * ```
 *
 * By default, it'll stream results character-by-character to the frontend.
 */
export function AI({
  children,
  renderDirectlyIntoDOM,
  renderPassedReactComponents,
}: {
  children: React.ReactNode;
  /**
   * If true, the AI's response will be interpreted as HTML, and written directly into the DOM, via dangerouslySetInnerHTML.
   *
   * This prop and `renderPassedReactComponents` should not be set at the same time.
   */
  renderDirectlyIntoDOM?: boolean;

  /**
   * If true, the AI's response will be interpreted as a set of React components, and returned to React for rendering.
   *
   * If the AI's response is malformed and can't be interpreted as React components, this will blow up in a potentially surprising way.
   *
   * This prop and `renderDirectlyIntoDOM` should not be set at the same time.
   */
  renderPassedReactComponents?: boolean;
}) {
  if (renderPassedReactComponents) {
    return (
      <Suspense fallback={<Loading />}>
        <AIInterpretedReactComponents>{children}</AIInterpretedReactComponents>
      </Suspense>
    );
  }
  if (renderDirectlyIntoDOM) {
    return (
      <Suspense fallback={<Loading />}>
        <AIDirectToDOM>{children}</AIDirectToDOM>
      </Suspense>
    );
  }

  return <AIStream>{children}</AIStream>;
}
