import * as AI from '../index.js';
import { RenderContext, Node, Renderable } from '../index.js';
import { Logger } from './log.js';

let memoizedId = 0;
export const isMemoizedSymbol = Symbol('isMemoized');

/**
 * Memoize a {@link Renderable} so it always returns the same thing.
 *
 * For example, imagine you have the following:
 * ```tsx
 *    const catName = (
 *      <ChatCompletion>
 *        <UserMessage>Give me a cat name</UserMessage>
 *      </ChatCompletion>
 *    );
 *
 *    <ChatCompletion>
 *      <UserMessage>
 *        I have a cat named {catName}. Tell me a story about {catName}.
 *      </UserMessage>
 *     </ChatCompletion>
 * ```
 *
 * In this case, `catName` will result in two separate model calls, so you'll get two different cat names.
 *
 * If this is not desired, you can wrap the component in `memo`:
 * ```tsx
 *    const catName = memo(<ChatCompletion>
 *      <UserMessage>Give me a cat name</UserMessage>
 *    </ChatCompletion>);
 *
 *    <ChatCompletion>
 *      <UserMessage>
 *        I have a cat named {catName}. Tell me a story about {catName}.
 *      </UserMessage>
 *     </ChatCompletion>
 * ```
 * Now, `catName` will result in a single model call, and its value will be reused everywhere that component appears
 * in the tree.
 *
 * The memoization is fully recursive.
 */
export function memo(renderable: Renderable): Node {
  if (typeof renderable !== 'object' || renderable === null) {
    return renderable;
  }
  if (AI.isIndirectNode(renderable)) {
    const memoized = memo(AI.getReferencedNode(renderable));
    return AI.makeIndirectNode(renderable, memoized);
  }

  if (Array.isArray(renderable)) {
    return renderable.map(memo);
  }
  if (AI.isElement(renderable)) {
    if (isMemoizedSymbol in renderable.props) {
      return renderable;
    }

    // N.B. The memoization applies per-RenderContext -- if the same component is rendered under
    // two different RenderContexts, it won't be memoized.
    const memoizedValues = new WeakMap<RenderContext, Renderable>();
    const newElement = {
      ...renderable,
      render: (ctx: RenderContext, logger: Logger) => {
        if (memoizedValues.has(ctx)) {
          return memoizedValues.get(ctx);
        }

        let renderResult: Renderable;
        try {
          renderResult = memo(renderable.render(ctx, logger));
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
    const sink: (Renderable | typeof AI.AppendOnlyStream)[] = [];
    let finalResult: Renderable | typeof AI.AppendOnlyStream = null;
    let completed = false;
    let nextPromise: Promise<void> | null = null;

    const MemoizedGenerator = async function* (): AsyncGenerator<
      Renderable | typeof AI.AppendOnlyStream,
      Renderable | typeof AI.AppendOnlyStream
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
            const memoized = result.value === AI.AppendOnlyStream ? result.value : memo(result.value);
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

  const memoizedRenderable = renderable.then(memo);
  const MemoizedPromise = () => memoizedRenderable;
  return <MemoizedPromise id={++memoizedId} {...{ [isMemoizedSymbol]: true }} />;
}
