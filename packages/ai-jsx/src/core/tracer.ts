import { AsyncLocalStorage } from 'ai-jsx/lib/_shims/async-local-storage';
import { PartiallyRendered, StreamRenderer } from './render.js';
import { Element, isElement } from './node.js';
import { memoizedIdSymbol } from './memoize.js';

export abstract class Span {
  public abstract setAttribute(key: string, value: unknown): void;
  public abstract end(status: 'ok', result: PartiallyRendered[]): void;
  public abstract end(status: 'error', exception: unknown): void;
}

export abstract class Tracer<TSpan extends Span = Span> {
  private storage = new AsyncLocalStorage<{ span: TSpan; memoizedId?: number; memoizedOwner?: boolean }>();
  private memoizedSubtreeRootsById = new Map<number, TSpan>();

  public abstract trace(
    element: Element<any>,
    parent: TSpan | undefined,
    memoizedOwner: TSpan | undefined,
    fn: (span: TSpan) => void
  ): void;

  public get currentSpan(): TSpan | undefined {
    return this.storage.getStore()?.span;
  }

  public bindAsyncGeneratorToActiveContext<T = unknown, TReturn = any, TNext = unknown>(
    generator: AsyncGenerator<T, TReturn, TNext>
  ): AsyncGenerator<T, TReturn, TNext> {
    const ctx = this.storage.getStore();
    if (ctx === undefined) {
      return generator;
    }

    const result = {
      next: () => this.storage.run(ctx, generator.next.bind(generator)),
      return: (args: Parameters<typeof generator.return>[0]) =>
        this.storage.run(ctx, generator.return.bind(generator), args),
      throw: (args: Parameters<typeof generator.throw>[0]) =>
        this.storage.run(ctx, generator.throw.bind(generator), args),

      [Symbol.asyncIterator]() {
        return result;
      },
    };

    return result;
  }

  public wrapRender(streamRenderer: StreamRenderer): StreamRenderer {
    const wrappedRender: StreamRenderer = (renderContext, renderable, shouldStop, appendOnly) => {
      if (!isElement(renderable)) {
        return streamRenderer(renderContext, renderable, shouldStop, appendOnly);
      }

      let resultingGenerator: null | ReturnType<StreamRenderer> = null;
      const memoizedId = renderable.props[memoizedIdSymbol];
      const currentContext = this.storage.getStore();
      let memoizedSubtreeRoot: TSpan | undefined = undefined;
      let additionalContext: { memoizedId?: number; memoizedOwner?: boolean } = {};
      if (memoizedId) {
        memoizedSubtreeRoot = this.memoizedSubtreeRootsById.get(memoizedId);
        if (!memoizedSubtreeRoot || (currentContext?.memoizedId === memoizedId && currentContext?.memoizedOwner)) {
          // Nothing is tracing this subtree yet, or we're the owner of this subtree.
          memoizedSubtreeRoot = undefined;
          additionalContext = { memoizedId, memoizedOwner: true };
        } else {
          // Something else is actively tracing this subtree.
          additionalContext = { memoizedId, memoizedOwner: false };
        }
      }

      try {
        this.trace(renderable, this.currentSpan, memoizedSubtreeRoot, (span) => {
          const isMemoizedSubtreeRoot = memoizedId && !this.memoizedSubtreeRootsById.has(memoizedId);
          const memoizedSubtreeMap = this.memoizedSubtreeRootsById;
          if (isMemoizedSubtreeRoot) {
            memoizedSubtreeMap.set(memoizedId, span);
          }

          this.storage.run({ span, ...additionalContext }, () => {
            async function* gen() {
              let result: PartiallyRendered[] | undefined = undefined;
              let ended = false;
              try {
                result = yield* streamRenderer(renderContext, renderable, shouldStop, appendOnly);
                try {
                  ended = true;
                  span.end('ok', result);
                } catch {
                  // Ignore errors from ending the span.
                }
                return result;
              } catch (ex) {
                if (!ended) {
                  try {
                    ended = true;
                    span.end('error', ex);
                  } catch {
                    // Ignore errors from ending the span.
                  }
                }
                throw ex;
              } finally {
                if (!ended) {
                  try {
                    span.end('error', null);
                  } catch {
                    // Ignore errors from ending the span.
                  }
                }
                if (isMemoizedSubtreeRoot) {
                  memoizedSubtreeMap.delete(memoizedId);
                }
              }
            }

            resultingGenerator = this.bindAsyncGeneratorToActiveContext(gen());
          });
        });

        if (resultingGenerator) {
          return resultingGenerator;
        }
      } catch (ex) {}

      // The tracer either threw an exception or opted not to trace the element.
      return streamRenderer(renderContext, renderable, shouldStop, appendOnly);
    };

    return wrappedRender;
  }
}
