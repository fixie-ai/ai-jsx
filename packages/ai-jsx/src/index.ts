export type Component<P> = (props: P, renderContext: RenderContext) => Renderable;
export type Literal = string | number | null | undefined | boolean;

const attachedContext = Symbol('LLMx.attachedContext');
export interface Element<P extends object> {
  tag: Component<P>;
  props: P;
  render: (renderContext: RenderContext) => Renderable;
  [attachedContext]?: RenderContext;
}

export interface ReactComponentAsSeenByLLMx {
  readonly $$typeof: symbol;
  type: {
    name: string;
  };
  props: Record<string, any>;
}

export type Node = Element<any> | Literal | Node[] | ReactComponentAsSeenByLLMx;

export type Renderable = Node | Promise<Renderable> | AsyncGenerator<Renderable>;

export type ElementPredicate = (e: Element<any>) => boolean;
export type PropsOfComponent<T extends Component<any>> = T extends Component<infer P> ? P : never;

export type PartialRenderStream = (
  renderContext: RenderContext,
  renderable: Renderable,
  shouldStop: ElementPredicate
) => AsyncGenerator<PartiallyRendered[]>;

const contextKey = Symbol('LLMx.contextKey');
export interface Context<T> {
  Provider: Component<{ children: Node; value: T }>;
  [contextKey]: [T, symbol];
}

export interface RenderContext {
  partialRenderStream(renderable: Renderable, shouldStop: ElementPredicate): AsyncGenerator<PartiallyRendered[]>;
  partialRender(renderable: Renderable, shouldStop: ElementPredicate): Promise<PartiallyRendered[]>;
  renderStream(renderable: Renderable): AsyncGenerator<string>;
  render(renderable: Renderable): Promise<string>;

  getContext<T>(ref: Context<T>): T;

  pushContext<T>(ref: Context<T>, value: T): RenderContext;
  wrapRender(render: (r: PartialRenderStream) => PartialRenderStream): RenderContext;
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

/**
 * This is a very hacky way to "dehydrate" a React component into a prompt.
 */
export function hackyDehydrate(renderable: ReactComponentAsSeenByLLMx): string {
  return `<${renderable.type.name}>${renderable.props.children}</${renderable.type.name}>}`;
}

type PartiallyRendered = string | Element<any>;

async function* partialRenderStream(
  context: RenderContext,
  renderable: Renderable,
  shouldStop: ElementPredicate
): AsyncGenerator<PartiallyRendered[]> {
  // console.log('render stream', renderable, typeof renderable);
  if (typeof renderable === 'string') {
    yield [renderable];
  } else if (typeof renderable === 'number') {
    yield [renderable.toString()];
  } else if (typeof renderable === 'undefined' || typeof renderable === 'boolean' || renderable === null) {
    yield [];
  } else if ('$$typeof' in renderable) {
    // console.log('dehydrate ===================')
    yield [hackyDehydrate(renderable)];
  }
  else if (Array.isArray(renderable)) {
    interface InProgressRender {
      generator: AsyncGenerator<PartiallyRendered[]>;
      currentValue: PartiallyRendered[];

      // Resolves to a function that applies the update to the in-progress render.
      // Will be null when the generator is exhausted.
      currentPromise: Promise<() => boolean> | null;
    }

    // Mutates an InProgressRender with an iterator result yielded from its generator.
    const applyUpdate = (result: IteratorResult<PartiallyRendered[]>, render: InProgressRender): boolean => {
      if (result.done) {
        render.currentPromise = null;
      } else {
        render.currentValue = result.value;
        render.currentPromise = render.generator.next().then((nextResult) => () => applyUpdate(nextResult, render));
      }

      return render.currentPromise !== null;
    };

    const inProgressRenders = renderable.map((r) => {
      const generator = context.partialRenderStream(r, shouldStop);
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

    yield currentValue();

    while (true) {
      const remaining = remainingPromises();
      if (remaining.length === 0) {
        break;
      }

      // Each time a promise resolves with a new value, yield again.
      const nextApply = await Promise.race(remaining);
      if (nextApply()) {
        yield currentValue();
      }
    }
  } else if (isElement(renderable)) {
    if (shouldStop(renderable)) {
      // If the renderable already has a context bound to it, leave it as-is because that context would've
      // taken precedence over the current one. But, if it does _not_ have a bound context, we bind
      // the current context so that if/when it is rendered, rendering will "continue on" as-is.
      if (!renderable[attachedContext]) {
        yield [withContext(renderable, context)];
      } else {
        yield [renderable];
      }
    } else {
      const renderingContext = renderable[attachedContext] ?? context;
      if (renderingContext !== context) {
        // We need to switch contexts before we can render the element.
        yield* renderingContext.partialRenderStream(renderable, shouldStop);
      } else {
        yield* renderingContext.partialRenderStream(renderable.render(renderingContext), shouldStop);
      }
    }
  } else if (renderable instanceof Promise) {
    yield* await renderable.then((x) => context.partialRenderStream(x, shouldStop));
  } else {
    // Exhaust the iterator.
    try {
      for await (const value of renderable) {
        yield* context.partialRenderStream(value, shouldStop);
      }
    } catch (e) {
      console.error(e, renderable, 'Error while rendering');
    }
  }
}

export function createRenderContext(
  render: PartialRenderStream = partialRenderStream,
  userContext: Record<symbol, any> = {}
): RenderContext {
  const context: RenderContext = {
    partialRenderStream: (renderable, shouldStop) => render(context, renderable, shouldStop),
    async partialRender(renderable: Renderable, shouldStop: ElementPredicate): Promise<PartiallyRendered[]> {
      let lastValue: PartiallyRendered[] = [];
      for await (const value of context.partialRenderStream(renderable, shouldStop)) {
        lastValue = value;
      }
      return lastValue;
    },
    async *renderStream(renderable: Renderable): AsyncGenerator<string> {
      for await (const value of context.partialRenderStream(renderable, () => false)) {
        yield value.join('');
      }
    },
    async render(renderable: Renderable): Promise<string> {
      const elementsOrStrings = await context.partialRender(renderable, () => false);
      return elementsOrStrings.join('');
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
