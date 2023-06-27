import * as ReactModule from 'react';
import 'server-only';
import { LogImplementation } from '../../core/log.js';
import * as AI from '../../react/core.js';
import { asJsxBoundary } from '../../react/jsx-boundary.js';
export * from '../../react/core.js';
import { Image } from '../../core/image-gen.js';
import _ from 'lodash';

const specialReactElements = [
  { tag: AI.React, unwrap: (element: AI.Element<any>) => element.props.children },
  { tag: Image, unwrap: (element: AI.Element<any>) => ReactModule.createElement('img', element.props) },
];

function unwrapReact(partiallyRendered: AI.PartiallyRendered): ReactModule.ReactNode {
  if (AI.isElement(partiallyRendered)) {
    for (const { tag, unwrap } of specialReactElements) {
      if (partiallyRendered.tag === tag) {
        return unwrap(partiallyRendered);
      }
    }
    const expectedElements = _.map(specialReactElements, 'tag').join(', ');
    throw new Error(`AI.jsx internal error: unwrapReact only expects to see ${expectedElements} or strings.`);
  }

  return partiallyRendered;
}

/**
 * If `frame` is prefixed by `prefix`, returns the rest of `frame`, i.e. the suffix. Otherwise returns null.
 * @returns The computed suffix, or null if `frame` is not prefixed by `prefix.
 */
function computeSuffix(
  prefix: ReactModule.ReactNode[],
  frame: ReactModule.ReactNode[]
): ReactModule.ReactNode[] | null {
  const computedSuffix = [] as ReactModule.ReactNode[];
  for (let i = 0; i < frame.length; ++i) {
    if (i >= prefix.length) {
      computedSuffix.push(...frame.slice(i));
      return null;
    }
    if (computedSuffix.length > 0) {
      return null;
    }
    if (prefix[i] === frame[i]) {
      continue;
    }

    const fromPrefix = prefix[i];
    const fromFrame = frame[i];

    if (typeof fromPrefix === 'string' && typeof fromFrame === 'string' && fromFrame.startsWith(fromPrefix)) {
      computedSuffix.push(fromFrame.slice(fromPrefix.length));
    } else {
      // Assume any non-string ReactNodes with different identities are distinct.
      return null;
    }
  }

  return computedSuffix;
}

/**
 * A JSX component that allows AI.JSX elements to be used in a [NextJS RSC component tree](https://nextjs.org/docs/getting-started/react-essentials#server-components).
 */
export const jsx = asJsxBoundary(function jsx(
  { props, children }: { props?: { logger?: LogImplementation }; children: AI.Node },
  context?: any | AI.ComponentContext
) {
  if (typeof context?.render === 'function') {
    // We're in AI.JSX already.
    return children as any;
  }

  const renderResult = AI.createRenderContext(props ?? {}).render(children, {
    stop: (e) => specialReactElements.some((special) => special.tag === e.tag),
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
    /**
     * Replaces the entire existing stream (rather than appending to it). Must be used
     * when the stream is complete to indicate that the stream has finished.
     */
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

    // Otherwise, construct a new "replaceable stream". By streaming deltas into the _fallback_
    // tree of a `<Suspense>` component we can replace the whole thing if it turns out a frame
    // does more than simply appending to the previous frame. But, if the entire stream is built-up
    // exclusively by appends it means that the total data transferred is O(n) instead of O(n^2).
    //
    // For non-append-only streams we could do better by fixing the parts of the tree that are
    // fully resolved and only updating the portions of the tree that are still evolving, but
    // `render` doesn't currently provide enough visibility into rendering to do this.
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

  // Since we start without any prefix or <Suspense> boundary, `replace` is simply the identity function.
  return ReactModule.createElement(Stream as any, {
    replace: (node: ReactModule.ReactNode) => node,
  }) as JSX.Element;
});
export const JSX = jsx;
