import * as LLMx from '@fixieai/ai-jsx';
import React from './react';

import { Suspense } from 'react';
import { EventEmitter } from 'stream';
import _ from 'lodash';
import Image from 'next/image';
import {
  Recipe,
  RecipeIngredientList,
  RecipeInstructionList,
  RecipeIngredientListItem,
  RecipeInstructionListItem,
  RecipeTitle,
  SelectIngredientsButton,
} from './recipe/page';

function Loading() {
  return <Image src="/loading.gif" width={100} height={100} alt="loading" />;
}

function Defer(props: { emitter: any; index: number }) {
  return new Promise((resolve) => {
    props.emitter.once(`value-${props.index}`, resolve);
  });
}

async function AIDirectToDOM({ children }: { children: React.ReactNode }) {
  const rendered = await LLMx.createRenderContext().render(children);
  return <div className="contents-generated-by-ai-buckle-up-buddy" dangerouslySetInnerHTML={{ __html: rendered }} />;
}

async function AIInterpretedReactComponents({ children }: { children: React.ReactNode }) {
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

  const rendered = await LLMx.createRenderContext().render(children);

  let modelResponseJSON;
  try {
    modelResponseJSON = JSON.parse(rendered);
  } catch (e) {
    console.error(`Failed to parse JSON from model response: ${rendered}`, e);
    return rendered;
  }
  return parseJsonToReact(modelResponseJSON);
}

function AIStream({ children }: { children: React.ReactNode }) {
  const maxIndex = 1000;
  let highestIndexSeen = -1;
  const emitter = new EventEmitter();

  const stream = LLMx.createRenderContext().renderStream(children);
  function handleFrame({ value: frame, done }: { value: string; done: boolean }) {
    if (frame) {
      frame.split('').forEach((char, index) => {
        highestIndexSeen = Math.max(highestIndexSeen, index);
        emitter.emit(`value-${index}`, char);
      });
    }
    if (done) {
      // If we don't do this, we'll have a loading spinner in the browser tab.
      for (let indexToNotify = highestIndexSeen + 1; indexToNotify < maxIndex; indexToNotify++) {
        emitter.emit(`value-${indexToNotify}`, '');
      }
    } else {
      stream.next().then(handleFrame);
    }
  }
  stream.next().then(handleFrame);

  return (
    <>
      {_.range(maxIndex).map((i) => (
        <Suspense key={i}>
          <Defer emitter={emitter} index={i} />
        </Suspense>
      ))}
    </>
  );
}

export function AI({
  children,
  renderDirectlyIntoDOM,
  renderPassedReactComponents,
}: {
  children: React.ReactNode;
  renderDirectlyIntoDOM?: boolean;
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
