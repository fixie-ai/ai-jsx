import { Renderable, RenderContext, AppendOnlyStream, RenderableStream } from './render.js';
import { Node, getReferencedNode, isIndirectNode, makeIndirectNode, isElement } from './node.js';
import { Logger } from './log.js';

let lastMemoizedId = 0;
/** @hidden */
export const memoizedIdSymbol = Symbol('memoizedId');

/**
 * @hidden
 * "Partially" memoizes a renderable such that it will only be rendered once in any
 * single `RenderContext`.
 */
export function partialMemo(node: Node, existingId?: number): Node;
export function partialMemo(renderable: Renderable, existingId?: number): Renderable;
export function partialMemo(renderable: Renderable, existingId?: number): Node | Renderable {
  const id = existingId ?? ++lastMemoizedId;
  if (typeof renderable !== 'object' || renderable === null) {
    return renderable;
  }
  if (isIndirectNode(renderable)) {
    const memoized = partialMemo(getReferencedNode(renderable), id);
    return makeIndirectNode(renderable, memoized);
  }

  if (Array.isArray(renderable)) {
    return renderable.map((node) => partialMemo(node, id));
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
      render: (ctx: RenderContext, logger: Logger, isAppendOnlyRender: boolean) => {
        if (memoizedValues.has(ctx)) {
          return memoizedValues.get(ctx);
        }

        let renderResult: Renderable;
        try {
          renderResult = partialMemo(renderable.render(ctx, logger, isAppendOnlyRender), id);
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
    const generator = renderable[Symbol.asyncIterator]();
    const sink: (Renderable | typeof AppendOnlyStream)[] = [];
    let finalResult: Renderable | typeof AppendOnlyStream = null;
    let completed = false;
    let nextPromise: Promise<void> | null = null;

    return {
      [memoizedIdSymbol]: id,
      [Symbol.asyncIterator]: async function* (): AsyncGenerator<
        Renderable | typeof AppendOnlyStream,
        Renderable | typeof AppendOnlyStream
      > {
        let index = 0;
        while (true) {
          if (index < sink.length) {
            yield sink[index++];
            continue;
          } else if (completed) {
            return finalResult;
          } else if (nextPromise == null) {
            nextPromise = generator.next().then((result) => {
              const memoized = result.value === AppendOnlyStream ? result.value : partialMemo(result.value, id);
              if (result.done) {
                completed = true;
                finalResult = memoized;
              } else {
                sink.push(memoized);
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

  const memoizedPromise = renderable.then((r) => partialMemo(r, id));
  return {
    [memoizedIdSymbol]: id,
    then: memoizedPromise.then.bind(memoizedPromise),
  } as PromiseLike<Renderable>;
}
