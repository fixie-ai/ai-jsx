/** @jsxImportSource ai-jsx/react */
import React, { Suspense, ReactNode } from 'react';
import 'server-only';
import { LogImplementation } from '../../core/log.js';
import * as AI from '../../react/core.js';
import { asJsxBoundary } from '../../react/jsx-boundary.js';
import { AIJSXError, ErrorCode } from '../../core/errors.js';
import { toSerializedStreamResponse } from '../../stream/index.js';
import { ComponentMap } from '../../react/map.js';
export * from '../../react/core.js';
import { Image } from '../../core/image-gen.js';
import _ from 'lodash';
import { Clock, DelayedReveal } from './client.js';

/**
 * The {@link jsx} component will render its children until it gets to boundary elements.
 * This object defines how the boundary elements are handled.
 */
const boundaryElements = [
  { tag: AI.React, unwrap: (e: AI.Element<any>) => e.props.children },
  { tag: Image, unwrap: (e: AI.Element<any>) => <img src={e.props.url} /> },
];

function unwrapReact(partiallyRendered: AI.PartiallyRendered): ReactNode {
  if (AI.isElement(partiallyRendered)) {
    for (const { tag, unwrap } of boundaryElements) {
      if (partiallyRendered.tag === tag) {
        return unwrap(partiallyRendered);
      }
    }
    const expectedElements = _.map(boundaryElements, 'tag').join(' or ');
    throw new AIJSXError(
      `unwrapReact only expects to see ${expectedElements} elements or strings.`,
      ErrorCode.UnexpectedRenderType,
      'internal'
    );
  }

  return partiallyRendered;
}

/**
 * If `frame` is prefixed by `prefix`, returns the rest of `frame`, i.e. the suffix. Otherwise returns null.
 * @returns The computed suffix, or null if `frame` is not prefixed by `prefix.
 */
function computeSuffix(prefix: ReactNode[], frame: ReactNode[]): ReactNode[] | null {
  const computedSuffix = [] as ReactNode[];
  for (let i = 0; i < frame.length; ++i) {
    if (i >= prefix.length) {
      computedSuffix.push(...frame.slice(i));
      break;
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

type StreamType = 'smooth' | 'fast';

function StreamRoot({ stream, children }: { stream?: StreamType; children: ReactNode }) {
  if (stream === 'smooth') {
    return <Clock serverOrigin={new Date().valueOf()}>{children}</Clock>;
  }

  return children;
}

function Chunk({ stream, children }: { stream?: StreamType; children: ReactNode }) {
  if (stream === 'smooth') {
    return <DelayedReveal t={new Date().valueOf()}>{children}</DelayedReveal>;
  }

  return children;
}

/**
 * A JSX component that allows AI.JSX elements to be used in a [NextJS RSC component tree](https://nextjs.org/docs/getting-started/react-essentials#server-components).
 */
export const jsx = asJsxBoundary(function jsx(
  {
    logger,
    stream,
    children,
    onComplete,
  }: {
    logger?: LogImplementation;
    stream?: StreamType;
    children: AI.Node;
    onComplete?: (finalText: string, finalUI: ReactNode) => void;
  },
  context?: any | AI.ComponentContext
) {
  if (typeof context?.render === 'function') {
    // We're in AI.JSX already.
    return children as any;
  }

  const renderResult = AI.createRenderContext({ logger }).render(children, {
    stop: (e) => boundaryElements.some((special) => special.tag === e.tag),
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
    prefix?: ReactNode[];
    /**
     * Replaces the entire existing stream (rather than appending to it). Must be used
     * when the stream is complete to indicate that the stream has finished.
     */
    replace: (value: ReactNode) => ReactNode;
  }): Promise<ReactNode> {
    const nextResult = await asyncIterator.next();

    if (nextResult.done) {
      const finalResult = nextResult.value.map(unwrapReact);
      const finalText = nextResult.value.filter((v) => typeof v === 'string').join('');
      onComplete?.(finalText, finalResult);
      return replace(finalResult);
    }

    // If we can append the stream, do so.
    const suffix = prefix && computeSuffix(prefix, nextResult.value);
    if (suffix) {
      return (
        <>
          <Chunk stream={stream}>{suffix}</Chunk>
          <Suspense fallback={null}>
            {/* @ts-expect-error Server Component */}
            <Stream prefix={nextResult.value} replace={replace} />
          </Suspense>
        </>
      );
    }

    // Otherwise, construct a new "replaceable stream". By streaming deltas into the _fallback_
    // tree of a `<Suspense>` component we can replace the whole thing if it turns out a frame
    // does more than simply appending to the previous frame. But, if the entire stream is built-up
    // exclusively by appends it means that the total data transferred is O(n) instead of O(n^2).
    //
    // For non-append-only streams we could do better by fixing the parts of the tree that are
    // fully resolved and only updating the portions of the tree that are still evolving, but
    // `render` doesn't currently provide enough visibility into rendering to do this.
    let newReplace: ((value: ReactNode) => ReactNode) | undefined = undefined;
    const finalResult = new Promise<ReactNode>((resolve) => {
      newReplace = (node) => {
        // Resolve it in a microtask to work around an issue where the fallback value
        // tries to replace the final value.
        queueMicrotask(() => resolve(node));
        return '';
      };
    });

    const replaceableStream = (
      <Suspense
        fallback={
          <>
            <Chunk stream={stream}>{nextResult.value}</Chunk>
            {/* @ts-expect-error Server Component */}
            <Stream prefix={nextResult.value} replace={newReplace} />
          </>
        }
      >
        {/* @ts-expect-error Server Component */}
        {finalResult}
      </Suspense>
    );

    return replace(replaceableStream);
  }

  // Since we start without any prefix or <Suspense> boundary, `replace` is simply the identity function.
  return (
    <StreamRoot stream={stream}>
      {/* @ts-expect-error Server Component */}
      <Stream replace={(node) => node} />
    </StreamRoot>
  );
});
export const JSX = jsx;

export function toReactStream(
  componentMap: ComponentMap<any>,
  renderable: AI.Renderable,
  renderContextOpts?: Parameters<typeof AI.createRenderContext>[0]
): Response {
  const renderResult = AI.createRenderContext(renderContextOpts).render(renderable, {
    stop: (e) => boundaryElements.some((special) => special.tag === e.tag),
    map: (x) => x,
  });
  return toSerializedStreamResponse(renderResult, AI.createElementSerializer(componentMap));
}
