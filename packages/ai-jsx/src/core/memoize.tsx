import {
  Renderable,
  RenderContext,
  AppendOnlyStream,
  RenderableStream,
  AppendOnlyStreamValue,
  isAppendOnlyStreamValue,
  valueToAppend,
} from './render.js';
import { Node, Element, getReferencedNode, isIndirectNode, makeIndirectNode, isElement } from './node.js';
import { Logger } from './log.js';
import { Tracer } from './tracer.js';
import _ from 'lodash';

/** @hidden */
export const memoizedIdSymbol = Symbol('memoizedId');

/**
 * @hidden
 * "Partially" memoizes a renderable such that it will only be rendered once in any
 * single `RenderContext`.
 */
export function partialMemo<T>(element: Element<T>, id: number, tracer: Tracer | undefined): Element<T>;
export function partialMemo(node: Node, id: number, tracer: Tracer | undefined): Node;
export function partialMemo(renderable: Renderable, id: number, tracer: Tracer | undefined): Renderable;
export function partialMemo(renderable: Renderable, id: number, tracer: Tracer | undefined): Node | Renderable {
  if (typeof renderable !== 'object' || renderable === null) {
    return renderable;
  }
  if (isIndirectNode(renderable)) {
    const memoized = partialMemo(getReferencedNode(renderable), id, tracer);
    return makeIndirectNode(renderable, memoized);
  }

  if (Array.isArray(renderable)) {
    return renderable.map((node) => partialMemo(node, id, tracer));
  }
  if (isElement(renderable)) {
    if (memoizedIdSymbol in renderable.props) {
      return renderable;
    }

    // N.B. "Partial" memoization applies per-RenderContext -- if the same component is
    // rendered under two different RenderContexts, it won't be memoized. However, the
    // top-level RenderContext.memo will additionally bind the top-level `Renderable` to a
    // single RenderContext to ensure that it only renders once.
    //
    // We do _not_ memoize separate results based on the value of `isAppendOnlyRender`, as
    // components should emit functionally equivalent results. However, this means that if
    // a memoized component is rendered _first_ in an append-only render, a non-append-only
    // render may see a stream optimized for append-only contexts.
    const memoizedValues = new WeakMap<RenderContext, Renderable>();
    const newElement = {
      ...renderable,
      props: { ...renderable.props, [memoizedIdSymbol]: id },
      render: (ctx: RenderContext, logger: Logger, tracer: Tracer | undefined, isAppendOnlyRender: boolean) => {
        if (memoizedValues.has(ctx)) {
          return memoizedValues.get(ctx);
        }

        let renderResult: Renderable;
        try {
          renderResult = partialMemo(renderable.render(ctx, logger, tracer, isAppendOnlyRender), id, tracer);
        } catch (ex) {
          // Wrap it in a promise so that it throws on await.
          renderResult = Promise.reject(ex);
        }

        memoizedValues.set(ctx, renderResult);
        return renderResult;
      },
    };
    Object.freeze(newElement);
    return newElement;
  }
  if (Symbol.asyncIterator in renderable) {
    if (memoizedIdSymbol in renderable) {
      return renderable;
    }

    // It's an async iterable (which might be mutable). We set up some machinery to buffer the
    // results so that we can create memoized iterators as necessary.
    const unboundGenerator = renderable[Symbol.asyncIterator]();

    // N.B. Async context doesn't get bound to the generator, so we need to do that manually.
    const generator = tracer?.bindAsyncGeneratorToActiveContext(unboundGenerator) ?? unboundGenerator;
    const sink: (Node | AppendOnlyStreamValue)[] = [];

    let completed = false;
    let nextPromise: Promise<void> | null = null;

    return {
      [memoizedIdSymbol]: id,
      async *[Symbol.asyncIterator](): AsyncGenerator<Node | AppendOnlyStreamValue, Node | AppendOnlyStreamValue> {
        let index = 0;
        let isAppendOnly = false;
        let didYieldSomething = false;

        while (true) {
          if (index < sink.length) {
            // There's something we can yield/return right away.
            let concatenatedNodes = [] as Node[];
            while (index < sink.length) {
              let value = sink[index++];
              if (isAppendOnlyStreamValue(value)) {
                if (!isAppendOnly && didYieldSomething && concatenatedNodes.length > 0) {
                  // The stream is transitioning to append-only, but we previously yielded a value
                  // that needs to be replaced before we start appending. Yield the replacement
                  // value (`concatenatedNodes`) before we start appending.
                  yield concatenatedNodes;
                  concatenatedNodes = [];
                }
                isAppendOnly = true;
                value = valueToAppend(value);
              }

              if (isAppendOnly) {
                concatenatedNodes.push(value);
              } else {
                // In case the stream changes to append-only, reset the concatenated nodes.
                concatenatedNodes = [value];
              }
            }

            const valueToYield = isAppendOnly ? AppendOnlyStream(concatenatedNodes) : _.last(sink);
            if (completed) {
              return valueToYield;
            }

            didYieldSomething = true;
            yield valueToYield;
            continue;
          }

          if (nextPromise == null) {
            nextPromise = generator.next().then((result) => {
              const memoized = isAppendOnlyStreamValue(result.value)
                ? AppendOnlyStream(partialMemo(valueToAppend(result.value), id, tracer))
                : partialMemo(result.value, id, tracer);

              sink.push(memoized);
              if (result.done) {
                completed = true;
              }
              nextPromise = null;
            });
          }

          await nextPromise;
        }
      },
    } as RenderableStream;
  }

  if (memoizedIdSymbol in renderable) {
    return renderable;
  }

  const memoizedPromise = renderable.then((r) => partialMemo(r, id, tracer));
  return {
    [memoizedIdSymbol]: id,
    then: memoizedPromise.then.bind(memoizedPromise),
  } as PromiseLike<Renderable>;
}
