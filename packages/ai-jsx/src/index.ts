/**
 * AI.JSX - The AI Application Framework for Javascript.
 *
 * See: https://ai-jsx.com for more details.
 *
 * @packageDocumentation
 */

import { v4 as uuidv4 } from 'uuid';
import { BoundLogger, NoOpLogImplementation, LogImplementation, Logger, PinoLogger } from './core/log.js';

/** A context that is used to render an AI.JSX component. */
export interface ComponentContext extends RenderContext {
  logger: Logger;
}

/** Represents a single AI.JSX component. */
export type Component<P> = (props: P, context: ComponentContext) => Renderable;

/**
 * A Literal represents a literal value.
 */
export type Literal = string | number | null | undefined | boolean;

const attachedContext = Symbol('AI.attachedContext');
/**
 * An Element represents an instance of an AI.JSX component, with an associated tag, properties, and a render function.
 */
export interface Element<P> {
  /** The tag associated with this {@link Element}. */
  tag: Component<P>;
  /** The component properties. */
  props: P;
  /** A function that renders this {@link Element} to a {@link Renderable}. */
  render: (renderContext: RenderContext, logger: Logger) => Renderable;
  /** The {@link RenderContext} associated with this {@link Element}. */
  [attachedContext]?: RenderContext;
}

const indirectNodeSymbol = Symbol('AI.indirectNode');
/**
 * An IndirectNode represents an opaque type with a reference to a {@link Node} that represents it.
 */
export interface IndirectNode {
  [indirectNodeSymbol]: Node;
}

/**
 * A Node represents an element of an AI.JSX component tree.
 */
export type Node = Element<any> | Literal | Node[] | IndirectNode;

/**
 * A RenderableStream represents an async iterable that yields {@link Renderable}s.
 */
export interface RenderableStream {
  [Symbol.asyncIterator]: () => AsyncIterator<Renderable, Renderable>;
}

/**
 * A Renderable represents a value that can be rendered to a string.
 */
export type Renderable = Node | PromiseLike<Renderable> | RenderableStream;

/** @hidden */
export type ElementPredicate = (e: Element<any>) => boolean;

/** @hidden */
export type PropsOfComponent<T extends Component<any>> = T extends Component<infer P> ? P : never;

/** @hidden */
export type PartiallyRendered = string | Element<any>;

/** @hidden */
export type StreamRenderer = (
  renderContext: RenderContext,
  renderable: Renderable,
  shouldStop: ElementPredicate
) => AsyncGenerator<PartiallyRendered[], PartiallyRendered[]>;

const contextKey = Symbol('AI.contextKey');
/** @hidden */
export interface Context<T> {
  Provider: Component<{ children: Node; value: T }>;
  [contextKey]: { defaultValue: T; userContextSymbol: symbol };
}

interface RenderOpts<TIntermediate = string, TFinal = string> {
  /**
   * Instructs rendering to stop rendering on certain elements. When specified,
   * rendering will return an array of strings and `Element`s rather than a
   * string.
   */
  stop?: TFinal extends string ? false : ElementPredicate;

  /**
   * Maps the intermediate (but not final) results produced by rendering. By default
   * the rendered elements are flattened into a string.
   * @param frame The intermediate rendering, including any `Element`s selected by `stop`.
   * @returns The value to yield.
   */
  map?: (frame: TFinal) => TIntermediate;
}

/**
 * The result of rendering. Can be `await`ed for the final result or used as an async
 * iterable to access the intermediate and final results.
 */
export interface RenderResult<TIntermediate, TFinal> {
  then: InstanceType<typeof Promise<TFinal>>['then'];
  [Symbol.asyncIterator]: () => AsyncIterator<TIntermediate, TFinal, unknown>;
}

const pushContextSymbol = Symbol('RenderContext.pushContext');
/**
 * A RenderContext is responsible for rendering an AI.JSX Node tree.
 */
export interface RenderContext {
  /**
   * Renders a value to a string, or if a `stop` function is provided, to an array
   * of strings or `Element`s. The result can be `await`ed for the final result, or
   * yielded from for intermediate results.
   * @param renderable The value to render.
   * @param opts Additional options.
   */
  render<TIntermediate = string>(
    renderable: Renderable,
    opts?: RenderOpts<TIntermediate>
  ): RenderResult<TIntermediate, string>;
  render<TIntermediate = string>(
    renderable: Renderable,
    opts: RenderOpts<TIntermediate, PartiallyRendered[]>
  ): RenderResult<TIntermediate, PartiallyRendered[]>;

  /**
   * Gets the current value associated with a context.
   * @param context The context holder, as returned from `createContext`.
   */
  getContext<T>(context: Context<T>): T;

  /**
   * Creates a new `RenderContext` by wrapping the existing render function.
   * @param getRenderer A function that returns the new renderer function.
   */
  wrapRender(getRenderer: (r: StreamRenderer) => StreamRenderer): RenderContext;

  /**
   * An internal function used to set the value associated with a given context.
   * @param context The context holder, as returned from `createContext`.
   * @param value The value to set.
   * @returns The new `RenderContext`.
   */
  [pushContextSymbol]: <T>(context: Context<T>, value: T) => RenderContext;
}

export function createElement<P extends { children: C }, C>(
  tag: Component<P>,
  props: Omit<P, 'children'> | null,
  ...children: [C]
): Element<P>;
/** @hidden */
export function createElement<P extends { children: C[] }, C>(
  tag: Component<P>,
  props: Omit<P, 'children'> | null,
  ...children: C[]
): Element<P>;
/** @hidden */
export function createElement<P extends { children: C | C[] }, C>(
  tag: Component<P>,
  props: Omit<P, 'children'> | null,
  ...children: C[]
): Element<P> {
  const propsToPass = {
    ...(props ?? {}),
    ...(children.length === 0 ? {} : { children: children.length === 1 ? children[0] : children }),
  } as P;

  const result = {
    tag,
    props: propsToPass,
    render: (ctx, logger) => tag(propsToPass, { ...ctx, logger }),
  } as Element<P>;
  Object.freeze(propsToPass);
  Object.freeze(result);
  return result;
}

/** @hidden */
export function isElement(value: unknown): value is Element<any> {
  return value !== null && typeof value === 'object' && 'tag' in value;
}

/** @hidden */
export function Fragment({ children }: { children: Node }): Renderable {
  return children;
}

/** @hidden */
export function withContext<P extends object>(element: Element<P>, context: RenderContext): Element<P> {
  const withContext = {
    ...element,
    [attachedContext]: context,
  };

  Object.freeze(withContext);
  return withContext;
}

/** @hidden */
export function createContext<T>(defaultValue: T): Context<T> {
  const ctx: Context<T> = {
    Provider: function ContextProvider(props: { value: T; children: Node }, { [pushContextSymbol]: pushContext }) {
      const fragment = createElement(Fragment, null, props.children);
      return withContext(fragment, pushContext(ctx, props.value));
    },
    [contextKey]: { defaultValue, userContextSymbol: Symbol() },
  };

  return ctx;
}

/** @hidden */
export function isIndirectNode(value: unknown): value is IndirectNode {
  return value !== null && typeof value === 'object' && indirectNodeSymbol in value;
}

/** @hidden */
export function getReferencedNode(value: IndirectNode): Node {
  return value[indirectNodeSymbol];
}

/** @hidden */
export function makeIndirectNode<T extends object>(value: T, node: Node): T & IndirectNode {
  return new Proxy(value, {
    has: (target, p) => p === indirectNodeSymbol || p in target,
    get: (target, p, receiver) => (p === indirectNodeSymbol ? node : Reflect.get(target, p, receiver)),
  }) as T & IndirectNode;
}

/** @hidden */
export const LoggerContext = createContext<LogImplementation>(new NoOpLogImplementation());

async function* renderStream(
  context: RenderContext,
  renderable: Renderable,
  shouldStop: ElementPredicate
): AsyncGenerator<PartiallyRendered[], PartiallyRendered[]> {
  // If we recurse, propagate the stop function but ensure that intermediate values are preserved.
  const recursiveRenderOpts: RenderOpts<PartiallyRendered[], PartiallyRendered[]> = {
    stop: shouldStop,
    map: (frame) => frame,
  };

  if (typeof renderable === 'string') {
    return [renderable];
  }
  if (typeof renderable === 'number') {
    return [renderable.toString()];
  }
  if (typeof renderable === 'undefined' || typeof renderable === 'boolean' || renderable === null) {
    return [];
  }
  if (isIndirectNode(renderable)) {
    return yield* context.render(getReferencedNode(renderable), recursiveRenderOpts);
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
      const generator = context.render(r, recursiveRenderOpts)[Symbol.asyncIterator]();
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
      return yield* renderingContext.render(renderable, recursiveRenderOpts);
    }
    const logImpl = renderingContext.getContext(LoggerContext);
    const renderId = uuidv4();
    try {
      return yield* renderingContext.render(
        renderable.render(renderingContext, new BoundLogger(logImpl, renderId, renderable)),
        {
          stop: shouldStop,
          map: (frame) => frame,
        }
      );
    } catch (ex) {
      logImpl.logException(renderable, renderId, ex);
      throw ex;
    }
  }

  if (Symbol.asyncIterator in renderable) {
    // Exhaust the iterator.
    const iterator = renderable[Symbol.asyncIterator]();
    while (true) {
      const next = await iterator.next();
      const frameValue = yield* context.render(next.value, recursiveRenderOpts);
      if (next.done) {
        return frameValue;
      }
      yield frameValue;
    }
  }

  if (!('then' in renderable)) {
    throw new Error(`AI.JSX bug: unexpected renderable type: ${JSON.stringify(renderable)}`);
  }
  // N.B. Because RenderResults are both AsyncIterable _and_ PromiseLikes, this means that an async component that returns the result
  // of a render call will not stream; it will effectively be `await`ed by default.
  const nextRenderable = await renderable.then((r) => r as Exclude<Renderable, PromiseLike<Renderable>>);
  return yield* context.render(nextRenderable, recursiveRenderOpts);
}

/**
 * Creates a new {@link RenderContext} with the provided logger.
 * @param logger The logger to use for the new context. If not provided, a new {@link PinoLogger} will be created.
 * @returns A new RenderContext.
 */
export function createRenderContext(opts?: { logger?: LogImplementation }) {
  const logger = opts?.logger ?? new PinoLogger();
  return createRenderContextInternal(renderStream, {
    [LoggerContext[contextKey].userContextSymbol]: logger,
  });
}

function createRenderContextInternal(render: StreamRenderer, userContext: Record<symbol, any>): RenderContext {
  const context: RenderContext = {
    render: <TFinal extends string | PartiallyRendered[], TIntermediate>(
      renderable: Renderable,
      opts?: RenderOpts<TIntermediate, TFinal>
    ): RenderResult<TIntermediate, TFinal> => {
      let promiseResult = null as Promise<any> | null;
      let hasReturnedGenerator = false;

      // Construct the generator that handles the provided options
      const generator = (async function* () {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        const shouldStop = (opts?.stop || (() => false)) as ElementPredicate;
        const generatorToWrap = render(context, renderable, shouldStop);
        while (true) {
          const next = await generatorToWrap.next();
          const value = opts?.stop ? (next.value as TFinal) : (next.value.join('') as TFinal);
          if (next.done) {
            if (promiseResult === null) {
              promiseResult = Promise.resolve(value);
            }
            return value;
          }

          if (opts?.map) {
            // If there's a mapper provided, use it.
            yield opts.map(value);
          } else if (opts?.stop) {
            // If we're doing partial rendering, exclude any elements we stopped on (to avoid accidentally leaking elements up).
            yield (value as PartiallyRendered[]).filter((e) => !isElement(e)).join('');
          } else {
            // Otherwise yield the (string) value as-is.
            yield value;
          }
        }
      })() as AsyncGenerator<TIntermediate, TFinal>;

      return {
        then: (onFulfilled?, onRejected?) => {
          if (promiseResult === null) {
            if (hasReturnedGenerator) {
              throw new Error(
                "The RenderResult's generator must be fully exhausted before you can await the final result."
              );
            }

            const flush = async () => {
              while (true) {
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
          if (hasReturnedGenerator) {
            throw new Error("The RenderResult's generator was already returned and cannot be returned again.");
          } else if (promiseResult !== null) {
            throw new Error('The RenderResult was already awaited and can no longer be used as an iterable.');
          }

          hasReturnedGenerator = true;
          return generator;
        },
      };
    },

    getContext: (ref) => {
      const { defaultValue, userContextSymbol } = ref[contextKey];
      if (userContextSymbol in userContext) {
        return userContext[userContextSymbol];
      }
      return defaultValue;
    },

    wrapRender: (getRender) => createRenderContextInternal(getRender(render), userContext),

    [pushContextSymbol]: (contextReference, value) =>
      createRenderContextInternal(render, { ...userContext, [contextReference[contextKey].userContextSymbol]: value }),
  };

  return context;
}
