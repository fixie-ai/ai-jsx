import 'server-only';
import * as ReactModule from 'react';
import * as LLMx from '../react/core.js';
export * from '../react/core.js';
import { markAsJsxBoundary } from '../react/jsx-boundary.js';

function unwrapReact(partiallyRendered: LLMx.PartiallyRendered): ReactModule.ReactNode {
  if (LLMx.isElement(partiallyRendered)) {
    // This should be an AI.React element.
    if (partiallyRendered.tag !== LLMx.React) {
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

/**
 * A JSX component that allows AI.jsx elements to be used in an RSC component tree.
 */
export function jsx({ children }: { children: LLMx.Node }, context?: any | LLMx.ComponentContext) {
  if (typeof context?.render === 'function') {
    // We're in AI.JSX already.
    return children;
  }

  const renderResult = LLMx.createRenderContext().render(children, {
    stop: (e) => e.tag === LLMx.React,
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

markAsJsxBoundary(jsx);
