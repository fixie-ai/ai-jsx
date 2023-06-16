import * as ReactModule from 'react';
import * as LLMx from '../index.js';
import { jsx as jsxFactory } from './jsx-runtime.js';
export * from '../index.js';
import 'server-only';

export declare namespace JSX {
  type ElementType = ReactModule.JSX.ElementType | LLMx.JSX.ElementType | typeof jsx;
  type Element = ReactModule.JSX.Element & LLMx.Node;
  type IntrinsicElements = ReactModule.JSX.IntrinsicElements;
  type ElementChildrenAttribute = ReactModule.JSX.ElementChildrenAttribute & LLMx.JSX.ElementChildrenAttribute;
}

export function createElement(...args: Parameters<typeof ReactModule.createElement>) {
  return jsxFactory(...args);
}

export const Fragment = ReactModule.Fragment;

export function jsx({ children }: { children: LLMx.Node }, context?: any | LLMx.ComponentContext) {
  if (typeof context?.render === 'function') {
    // We're in AI.JSX already.
    return children;
  }

  const renderResult = LLMx.createRenderContext().render(children);
  const asyncIterator = renderResult[Symbol.asyncIterator]();

  /**
   * (Ab)uses <Suspense> to stream an AI.JSX response, taking care to only stream deltas if
   * each frame only appends to the previous one.
   */
  async function Stream({
    prefix,
    replace,
  }: {
    prefix?: string;
    replace: (value: ReactModule.ReactNode) => ReactModule.ReactNode;
  }): Promise<ReactModule.ReactNode> {
    const nextResult = await asyncIterator.next();

    if (nextResult.done) {
      return replace(nextResult.value);
    }

    // If we can append the stream, do so.
    if (prefix && nextResult.value.startsWith(prefix)) {
      const delta = nextResult.value.slice(prefix.length);
      return [
        delta,
        ReactModule.createElement(
          ReactModule.Suspense,
          { fallback: '' },
          ReactModule.createElement(Stream as any, { prefix: nextResult.value, replace })
        ),
      ];
    }

    // Otherwise, construct a new replaceable stream.
    let newReplace: ((value: ReactModule.ReactNode) => ReactModule.ReactNode) | undefined = undefined;
    const finalResult = new Promise<ReactModule.ReactNode>((resolve) => {
      newReplace = (node) => {
        // Resolve it in a microtask to work around an issue where the fallback value
        // tries to replace the final value.
        queueMicrotask(() => resolve(node));
        return '';
      };
    });

    const replaceableStream = ReactModule.createElement(ReactModule.Suspense, {
      fallback: [
        nextResult.value,
        ReactModule.createElement(Stream as any, { prefix: nextResult.value, replace: newReplace }),
      ],
      children: ReactModule.createElement(() => finalResult as any),
    });

    return replace(replaceableStream);
  }

  return ReactModule.createElement(Stream as any, { replace: (node: ReactModule.ReactNode) => node });
}

// TODO: Support AI.React pattern
