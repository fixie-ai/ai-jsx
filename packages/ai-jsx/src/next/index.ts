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

function unwrapReact(partiallyRendered: LLMx.PartiallyRendered): ReactModule.ReactNode {
  if (LLMx.isElement(partiallyRendered)) {
    // This should be an AI.React element.
    if (partiallyRendered.tag !== React) {
      throw new Error('unwrapReact only expects to see AI.React elements or strings.');
    }

    return partiallyRendered.props.children;
  }

  return partiallyRendered;
}

function computeSuffix(prefix: ReactModule.ReactNode[], frame: ReactModule.ReactNode[]) {
  const computedSuffix = [] as ReactModule.ReactNode[];
  for (let i = 0; i < frame.length; ++i) {
    if (i >= prefix.length) {
      computedSuffix.push(frame[i]);
    } else if (computedSuffix.length > 0) {
      return null;
    } else if (prefix[i] === frame[i]) {
      continue;
    } else {
      const fromPrefix = prefix[i];
      const fromFrame = frame[i];

      if (typeof fromPrefix === 'string' && typeof fromFrame === 'string' && fromFrame.startsWith(fromPrefix)) {
        computedSuffix.push(fromFrame.slice(fromPrefix.length));
      } else {
        return null;
      }
    }
  }

  return computedSuffix;
}

export function jsx({ children }: { children: LLMx.Node }, context?: any | LLMx.ComponentContext) {
  if (typeof context?.render === 'function') {
    // We're in AI.JSX already.
    return children;
  }

  const renderResult = LLMx.createRenderContext().render(children, {
    stop: (e) => e.tag === React,
    map: (frame) => frame.map(unwrapReact),
  });
  const asyncIterator = renderResult[Symbol.asyncIterator]();

  /**
   * (Ab)uses <Suspense> to stream an AI.JSX response, taking care to only stream deltas if
   * each frame only appends to the previous one.
   */
  async function Stream({
    prefix,
    replace,
  }: {
    prefix?: ReactModule.ReactNode[];
    replace: (value: ReactModule.ReactNode) => ReactModule.ReactNode;
  }): Promise<ReactModule.ReactNode> {
    const nextResult = await asyncIterator.next();

    if (nextResult.done) {
      return replace(nextResult.value.map(unwrapReact));
    }

    // If we can append the stream, do so.
    const suffix = prefix && computeSuffix(prefix, nextResult.value);
    if (suffix) {
      return [
        suffix,
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

/**
 * A JSX component that allows React elements to be used in an AI.jsx component tree. If
 * the React components are forced to be rendered to a string within AI.jsx, they will be
 * serialized into a JSX string.
 */
export function React({ children }: { children: ReactModule.ReactNode }, context?: any | LLMx.ComponentContext) {
  if (typeof context?.render === 'function') {
    // We're in AI.JSX; serialize the React.
    // XXX/psalas: fix me
    return '<react components here>';
  }

  return children;
}
