import * as LLMx from '../index.js';
import { RenderContext, Node, Renderable } from '../index.js';

let memoizedId = 0;
export const isMemoizedSymbol = Symbol('isMemoized');

export function memo(renderable: Renderable): Node {
  /**
   * The memoization is fully recursive.
   */
  if (typeof renderable !== 'object' || renderable === null) {
    return renderable;
  }
  if (Array.isArray(renderable)) {
    return renderable.map(memo);
  }
  if (LLMx.isElement(renderable)) {
    if (isMemoizedSymbol in renderable.props) {
      return renderable;
    }

    // N.B. The memoization applies per-RenderContext -- if the same component is rendered under
    // two different RenderContexts, it won't be memoized.
    const memoizedValues = new WeakMap<RenderContext, Renderable>();
    const newElement = {
      ...renderable,
      render: (ctx: RenderContext) => {
        if (memoizedValues.has(ctx)) {
          return memoizedValues.get(ctx);
        }

        let renderResult: Renderable;
        try {
          renderResult = memo(renderable.render(ctx));
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
    const sink: Renderable[] = [];
    let finalResult: Renderable = null;
    let completed = false;
    let nextPromise: Promise<void> | null = null;

    const MemoizedGenerator = async function* (): AsyncGenerator<Renderable, Renderable> {
      let index = 0;
      while (true) {
        if (index < sink.length) {
          yield sink[index++];
          continue;
        } else if (completed) {
          return finalResult;
        } else if (nextPromise == null) {
          nextPromise = generator.next().then((result) => {
            if (result.done) {
              completed = true;
              finalResult = memo(result.value);
            } else {
              sink.push(memo(result.value));
            }
            nextPromise = null;
          });
        }

        await nextPromise;
      }
    };

    return <MemoizedGenerator id={++memoizedId} {...{ [isMemoizedSymbol]: true }} />;
  }

  const memoizedRenderable = renderable.then(memo);
  const MemoizedPromise = () => memoizedRenderable;
  return <MemoizedPromise id={++memoizedId} {...{ [isMemoizedSymbol]: true }} />;
}
