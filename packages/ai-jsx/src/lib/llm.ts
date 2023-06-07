export type Component<P> = (props: P, renderContext: RenderContext) => Renderable;
export type Literal = string | number | null | undefined | boolean;

const attachedContext = Symbol('LLMx.attachedContext');
export interface Element<P extends object> {
  tag: Component<P>;
  props: P;
  render: (renderContext: RenderContext) => Renderable;
  [attachedContext]?: RenderContext;
}
export type Node = Element<any> | Literal | Node[];

interface RenderableStream {
  [Symbol.asyncIterator]: () => AsyncIterator<Renderable, Renderable>;
}

export type Renderable = Node | PromiseLike<Renderable> | RenderableStream;

export type ElementPredicate = (e: Element<any>) => boolean;
export type PropsOfComponent<T extends Component<any>> = T extends Component<infer P> ? P : never;

type PartiallyRendered = string | Element<any>;

export type StreamRenderer = (
  renderContext: RenderContext,
  renderable: Renderable,
  shouldStop: ElementPredicate
) => AsyncGenerator<PartiallyRendered[], PartiallyRendered[]>;

const contextKey = Symbol('LLMx.contextKey');
export interface Context<T> {
  Provider: Component<{ children: Node; value: T }>;
  [contextKey]: [T, symbol];
}

interface RenderOpts<T> {
  stop?: false | ElementPredicate;
  mapIntermediate?: (item: PartiallyRendered[]) => T;
}

interface RenderResult<TIntermediate, TFinal> {
  then: InstanceType<typeof Promise<TFinal>>['then'];
  [Symbol.asyncIterator]: () => AsyncIterator<TIntermediate, TFinal, unknown>;
}

export interface RenderContext {
  render(renderable: Renderable, opts?: { stop?: false }): RenderResult<string, string>;
  render<T = PartiallyRendered[]>(renderable: Renderable, opts: RenderOpts<T>): RenderResult<T, PartiallyRendered[]>;

  getContext<T>(ref: Context<T>): T;

  pushContext<T>(ref: Context<T>, value: T): RenderContext;
  wrapRender(render: (r: StreamRenderer) => StreamRenderer): RenderContext;
}

export declare namespace JSX {
  interface ElementChildrenAttribute {
    children: {};
  }
}

export function createElement<P extends { children: C }, C>(
  tag: Component<P>,
  props: Omit<P, 'children'> | null,
  ...children: [C]
): Element<P>;
export function createElement<P extends { children: C[] }, C>(
  tag: Component<P>,
  props: Omit<P, 'children'> | null,
  ...children: C[]
): Element<P>;
export function createElement<P extends { children: C | C[] }, C>(
  tag: Component<P>,
  props: Omit<P, 'children'> | null,
  ...children: C[]
): Element<P> {
  const propsToPass = {
    ...(props ?? {}),
    children: children.length == 1 ? children[0] : children,
  } as P;

  const result = {
    tag,
    props: propsToPass,
    render: (ctx: RenderContext) => tag(propsToPass, ctx),
  };
  Object.freeze(propsToPass);
  Object.freeze(result);
  return result;
}

export function isElement(value: unknown): value is Element<any> {
  return value !== null && typeof value === 'object' && 'tag' in value;
}

export function Fragment({ children }: { children: Node }): Renderable {
  return children;
}

export function withContext<P extends object>(element: Element<P>, context: RenderContext): Element<P> {
  const withContext = {
    ...element,
    [attachedContext]: context,
  };

  Object.freeze(withContext);
  return withContext;
}

export function createContext<T>(defaultValue: T): Context<T> {
  const ctx: Context<T> = {
    Provider: function ContextProvider(props: { value: T; children: Node }, { pushContext }) {
      const fragment = createElement(Fragment, null, props.children);
      return withContext(fragment, pushContext(ctx, props.value));
    },
    [contextKey]: [defaultValue, Symbol()],
  };

  return ctx;
}

async function* renderStream(
  context: RenderContext,
  renderable: Renderable,
  shouldStop: ElementPredicate
): AsyncGenerator<PartiallyRendered[], PartiallyRendered[]> {
  if (typeof renderable === 'string') {
    return [renderable];
  }
  if (typeof renderable === 'number') {
    return [renderable.toString()];
  }
  if (typeof renderable === 'undefined' || typeof renderable === 'boolean' || renderable === null) {
    return [];
  }
  if (Array.isArray(renderable)) {
    interface InProgressRender {
      generator: AsyncIterator<PartiallyRendered[], PartiallyRendered[]>;
      currentValue: PartiallyRendered[];

      // Resolves to a function that applies the update to the in-progress render.
      // Will be null when the generator is exhausted.
      currentPromise: Promise<() => void> | null;
    }

    // Mutates an InProgressRender with an iterator result yielded from its generator.
    const applyUpdate = (
      result: IteratorResult<PartiallyRendered[], PartiallyRendered[]>,
      render: InProgressRender
    ) => {
      render.currentValue = result.value;
      if (result.done) {
        render.currentPromise = null;
      } else {
        render.currentPromise = render.generator.next().then((nextResult) => () => applyUpdate(nextResult, render));
      }
    };

    const inProgressRenders = renderable.map((r) => {
      const generator = context.render(r, { stop: shouldStop })[Symbol.asyncIterator]();
      const inProgressRender: InProgressRender = {
        generator,
        currentValue: [],
        currentPromise: generator.next().then((result) => () => applyUpdate(result, inProgressRender)),
      };

      return inProgressRender;
    });

    const currentValue = () => inProgressRenders.flatMap((r) => r.currentValue);
    const remainingPromises = () => inProgressRenders.flatMap((r) => (r.currentPromise ? [r.currentPromise] : []));

    // Wait for each sub-generator to yield once.
    const pendingUpdates = await Promise.all(remainingPromises());
    pendingUpdates.forEach((apply) => apply());

    let remaining = remainingPromises();
    while (remaining.length > 0) {
      yield currentValue();

      // Each time a promise resolves with a new value, yield again.
      const nextApply = await Promise.race(remaining);
      nextApply();
      remaining = remainingPromises();
    }

    return currentValue();
  }
  if (isElement(renderable)) {
    if (shouldStop(renderable)) {
      // If the renderable already has a context bound to it, leave it as-is because that context would've
      // taken precedence over the current one. But, if it does _not_ have a bound context, we bind
      // the current context so that if/when it is rendered, rendering will "continue on" as-is.
      if (!renderable[attachedContext]) {
        return [withContext(renderable, context)];
      }
      return [renderable];
    }
    const renderingContext = renderable[attachedContext] ?? context;
    if (renderingContext !== context) {
      // We need to switch contexts before we can render the element.
      return yield* renderingContext.render(renderable, { stop: shouldStop });
    }
    return yield* renderingContext.render(renderable.render(renderingContext), { stop: shouldStop });
  }

  if (Symbol.asyncIterator in renderable) {
    // Exhaust the iterator.
    const iterator = renderable[Symbol.asyncIterator]();
    for (;;) {
      const next = await iterator.next();
      const frameValue = yield* context.render(next.value, { stop: shouldStop });
      if (next.done) {
        return frameValue;
      }
      yield frameValue;
    }
  }

  // N.B. Because RenderResults are both AsyncIterable _and_ PromiseLikes, this means that an async component that returns the result
  // of a render call will not stream; it will effectively be `await`ed by default.
  const nextRenderable = await renderable.then((r) => r as Exclude<Renderable, PromiseLike<Renderable>>);
  return yield* context.render(nextRenderable, { stop: shouldStop });
}

export function createRenderContext(
  render: StreamRenderer = renderStream,
  userContext: Record<symbol, any> = {}
): RenderContext {
  const context: RenderContext = {
    render: <T>(renderable: Renderable, opts?: RenderOpts<T>): any => {
      let promiseResult = null as Promise<any> | null;
      let didReturnGenerator = false;

      // Construct the generator that handles the provided options
      const generator = (async function* () {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        const shouldStop = opts?.stop || (() => false);
        const generator = render(context, renderable, shouldStop);
        while (true) {
          const next = await generator.next();
          if (opts?.mapIntermediate) {
            // Streaming with stream map (implies partial rendering).
            if (next.done) {
              if (promiseResult === null) {
                promiseResult = Promise.resolve(next.value);
              }
              return next.value;
            }
            yield opts.mapIntermediate(next.value);
          } else if (opts?.stop) {
            // Partial rendering.
            if (next.done) {
              if (promiseResult === null) {
                promiseResult = Promise.resolve(next.value);
              }
              return next.value;
            }
            yield next.value;
          } else {
            // Full rendering.
            if (next.done) {
              const result = next.value.join('');
              if (promiseResult === null) {
                promiseResult = Promise.resolve(result);
              }
              return result;
            }
            yield next.value.join('');
          }
        }
      })();

      return {
        then: (onFulfilled: any, onRejected: any) => {
          if (promiseResult === null) {
            if (didReturnGenerator) {
              throw new Error(
                "The RenderResult's generator must be fully exhausted before you can await the final result."
              );
            }

            const flush = async () => {
              for (;;) {
                const next = await generator.next();
                if (next.done) {
                  return next.value;
                }
              }
            };

            promiseResult = flush();
          }

          return promiseResult.then(onFulfilled, onRejected);
        },

        [Symbol.asyncIterator]: () => {
          if (didReturnGenerator) {
            throw new Error("The RenderResult's generator was already returned and cannot be returned again.");
          }

          didReturnGenerator = true;
          return generator;
        },
      };
    },

    getContext: (ref) => {
      const [defaultValue, symbol] = ref[contextKey];
      if (symbol in userContext) {
        return userContext[symbol];
      }
      return defaultValue;
    },

    wrapRender: (getRender) => createRenderContext(getRender(render), userContext),
    pushContext: (contextReference, value) =>
      createRenderContext(render, { ...userContext, [contextReference[contextKey][1]]: value }),
  };

  return context;
}
