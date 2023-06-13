import * as LLMx from 'ai-jsx';
import React from './react.ts';
import { Suspense, ReactNode, useRef, useEffect } from 'react';
import {
  Recipe,
  RecipeIngredientList,
  RecipeInstructionList,
  RecipeIngredientListItem,
  RecipeInstructionListItem,
  RecipeTitle,
} from './recipe/page.tsx';

export function useAI(children: LLMx.Node, when: boolean = true) {
  const isInProgressRef = useRef(false);
  const mostRecentlyRenderedChildren = useRef(children);
  // If `children` changes, but a previous call is still in progress, will we properly start a new one?
  const [result, setResult] = React.useState('');
  const [isDone, setIsDone] = React.useState(false);

  useEffect(() => {
    if (isInProgressRef.current || !when) {
      return;
    }
    setResult('');
    setIsDone(false);
    LLMx.createRenderContext({
      logger: console.log,
    })
      .render(children, {
        // Streaming won't work. We see this error in the console:
        // xhr.js:174 The provided value 'stream' is not a valid enum value of type XMLHttpRequestResponseType.
        map: (frame) => setResult(frame),
      })
      .then((frame) => {
        isInProgressRef.current = false;
        mostRecentlyRenderedChildren.current = children;
        setResult(frame);
        setIsDone(true);
      });
  }, [children, when]);

  // It seems like there should be a better way to do this.
  const isActuallyDone = mostRecentlyRenderedChildren.current === children && isDone;

  return { result, isDone: isActuallyDone };
}

function Loading() {
  return <img src="/loading.gif" width={100} height={100} alt="loading" />;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function AIDirectToDOM({ children }: { children: ReactNode }) {
  const rendered = await LLMx.createRenderContext().render(children as LLMx.Renderable);
  return <div data-test="contents-generated-by-ai-buckle-up-buddy" dangerouslySetInnerHTML={{ __html: rendered }} />;
}

function AIInterpretedReactComponents({ children }: { children: LLMx.Node }) {
  // TODO: Pull this automatically from the input that was passed.
  const possibleComponents = {
    Recipe,
    RecipeTitle,
    RecipeInstructionList,
    RecipeIngredientList,
    RecipeInstructionListItem,
    RecipeIngredientListItem,
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

  const { result: rendered, isDone } = useAI(children);
  if (!isDone) {
    return <Loading />;
  }

  let modelResponseJSON;
  try {
    modelResponseJSON = JSON.parse(rendered);
  } catch (e) {
    throw new Error(`Failed to parse JSON from model response: ${rendered}`);
  }
  return parseJsonToReact(modelResponseJSON);
}

function AIStream({ children }: { children: LLMx.Node }) {
  return useAI(children).result;
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
  // renderDirectlyIntoDOM,
  renderPassedReactComponents,
}: {
  children: LLMx.Node;
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
  // if (renderDirectlyIntoDOM) {
  //   return (
  //     <Suspense fallback={<Loading />}>
  //       <AIDirectToDOM>{children}</AIDirectToDOM>
  //     </Suspense>
  //   );
  // }

  return <AIStream>{children}</AIStream>;
}
