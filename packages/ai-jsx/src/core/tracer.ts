import { AsyncLocalStorage } from 'node:async_hooks';
import { PartiallyRendered, StreamRenderer } from './render.js';
import { Element, isElement } from './node.js';

export abstract class Span {
  public abstract setAttribute(key: string, value: unknown): void;
  public abstract end(status: 'ok', result: PartiallyRendered[]): void;
  public abstract end(status: 'error', exception: unknown): void;
}

export abstract class Tracer<TSpan extends Span = Span> {
  private storage = new AsyncLocalStorage<TSpan>();

  public abstract trace(element: Element<any>, parent: TSpan | undefined, fn: (span: TSpan) => void): void;

  public get currentSpan(): TSpan | undefined {
    return this.storage.getStore();
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

      try {
        this.trace(renderable, this.currentSpan, (span) => {
          this.storage.run(span, () => {
            async function* gen() {
              let result: PartiallyRendered[] | undefined = undefined;
              try {
                result = yield* streamRenderer(renderContext, renderable, shouldStop, appendOnly);
                try {
                  span.end('ok', result);
                } catch {
                  // Ignore errors from ending the span.
                }
                return result;
              } catch (ex) {
                try {
                  span.end('error', ex);
                } catch {
                  // Ignore errors from ending the span.
                }
                throw ex;
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
