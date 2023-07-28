import { Renderable, RenderContext, AppendOnlyStream } from './render.js';
import { Node, getReferencedNode, isIndirectNode, makeIndirectNode, isElement } from './node.js';
import { Logger } from './log.js';

let memoizedId = 0;
/** @hidden */
export const isMemoizedSymbol = Symbol('isMemoized');

/**
 * @hidden
 * "Partially" memoizes a renderable such that it will only be rendered once in any
 * single `RenderContext`.
 */
export function partialMemo(renderable: Renderable): Node {
  if (typeof renderable !== 'object' || renderable === null) {
    return renderable;
  }
  if (isIndirectNode(renderable)) {
    const memoized = partialMemo(getReferencedNode(renderable));
    return makeIndirectNode(renderable, memoized);
  }

  if (Array.isArray(renderable)) {
    return renderable.map(partialMemo);
  }
  if (isElement(renderable)) {
    if (isMemoizedSymbol in renderable.props) {
      return renderable;
    }

    // N.B. "Partial" memoization applies per-RenderContext -- if the same component is
    // rendered under two different RenderContexts, it won't be memoized. However, the
    // top-level RenderContext.memo will additionally bind the top-level `Renderable` to a
    // single RenderContext to ensure that it only renders once.
    const memoizedValues = new WeakMap<RenderContext, Renderable>();
    const newElement = {
      ...renderable,
      render: (ctx: RenderContext, logger: Logger) => {
        if (memoizedValues.has(ctx)) {
          return memoizedValues.get(ctx);
        }

        let renderResult: Renderable;
        try {
          renderResult = partialMemo(renderable.render(ctx, logger));
        } catch (ex) {
          // Wrap it in a promise so that it throws on await.
          renderResult = Promise.reject(ex);
        }

        memoizedValues.set(ctx, renderResult);
        return renderResult;
      },
    };
    Object.freeze(newElement);

    const Memoized = () => newElement;
    return (
      <Memoized id={++memoizedId} {...{ [isMemoizedSymbol]: true }}>
        {newElement}
      </Memoized>
    );
  }
  if (Symbol.asyncIterator in renderable) {
    // It's an async iterable (which might be mutable). We set up some machinery to buffer the
    // results so that we can create memoized iterators as necessary.
    const generator = renderable[Symbol.asyncIterator]();
    const sink: (Renderable | typeof AppendOnlyStream)[] = [];
    let finalResult: Renderable | typeof AppendOnlyStream = null;
    let completed = false;
    let nextPromise: Promise<void> | null = null;

    const MemoizedGenerator = async function* (): AsyncGenerator<
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
            const memoized = result.value === AppendOnlyStream ? result.value : partialMemo(result.value);
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
    };

    return <MemoizedGenerator id={++memoizedId} {...{ [isMemoizedSymbol]: true }} />;
  }

  const memoizedRenderable = renderable.then(partialMemo);
  const MemoizedPromise = () => memoizedRenderable;
  return <MemoizedPromise id={++memoizedId} {...{ [isMemoizedSymbol]: true }} />;
}
