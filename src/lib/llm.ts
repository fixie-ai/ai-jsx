import * as readline from 'readline/promises';
import { log } from './index.ts';
import { v4 as uuidv4 } from 'uuid';
import { isMemoizedSymbol } from './memoize.tsx';

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

export function debug(value: unknown, expandJSXChildren: boolean = true): string {
  const previouslyMemoizedIds = new Set();

  function debugRec(value: unknown, indent: string, context: 'code' | 'children' | 'props'): string {
    if (typeof value === 'string') {
      if (context === 'props' || context === 'code') {
        return JSON.stringify(value);
      }
      return `{${JSON.stringify(value)}}`;
    }
    if (typeof value === 'number' || typeof value === 'bigint') {
      if (context === 'props' || context === 'children') {
        return `{${value.toString()}}`;
      }
      return value.toString();
    }
    if (typeof value === 'boolean' || typeof value === 'undefined') {
      return '';
    }
    if (value === null) {
      switch (context) {
        case 'code':
          return 'null';
        case 'children':
          return '{null}';
        case 'props':
          return '{null}';
      }
    } else if (isElement(value)) {
      const tag = value.tag === Fragment ? '' : value.tag.name;
      const childIndent = `${indent}  `;

      const isMemoized = isMemoizedSymbol in value.props;
      const memoizedIsPreviouslyRenderedToDebugOutput = previouslyMemoizedIds.has(value.props.id);

      if (isMemoized && !memoizedIsPreviouslyRenderedToDebugOutput) {
        previouslyMemoizedIds.add(value.props.id);
      }

      let children = '';
      if (expandJSXChildren && (!isMemoized || !memoizedIsPreviouslyRenderedToDebugOutput)) {
        children = debugRec(value.props.children, childIndent, 'children');
      }

      const results = [];
      if (value.props) {
        for (const key of Object.keys(value.props)) {
          const propValue = value.props[key];
          if (key === 'children' || propValue === undefined) {
            continue;
          } else {
            results.push(` ${key}=${debugRec(propValue, indent, 'props')}`);
          }
        }
      }

      const propsString = results.join('');

      const child =
        children !== ''
          ? `<${tag}${propsString}>\n${childIndent}${children}\n${indent}</${tag}>`
          : value.tag !== Fragment
          ? `<${tag}${propsString} />`
          : '<></>';

      switch (context) {
        case 'code':
        case 'children':
          return child;
        case 'props':
          return `{${child}}`;
      }
    } else if (Array.isArray(value)) {
      const filter =
        context === 'children'
          ? (x: unknown) =>
              x !== undefined && x !== null && typeof x !== 'boolean' && !(Array.isArray(x) && x.length == 0)
          : () => true;
      const values = value.filter(filter).map((v) => debugRec(v, indent, context === 'children' ? 'children' : 'code'));
      switch (context) {
        case 'children':
          return values.join(`\n${indent}`);
        case 'props':
          return `{[${values.join(', ')}]}`;
        case 'code':
          return `[${values.join(', ')}]`;
      }
    } else if (typeof value === 'object') {
      if (context === 'props' || context === 'children') {
        return `{${JSON.stringify(value)}}`;
      }
      return JSON.stringify(value);
    } else if (typeof value === 'function') {
      const toRender = value.name === '' ? value.toString() : value.name;
      if (context === 'props' || context === 'children') {
        return `{${toRender}}`;
      }
      return toRender;
    } else if (typeof value === 'symbol') {
      if (context === 'props' || context === 'children') {
        return `{${value.toString()}}`;
      }
      return value.toString();
    }
    return '';
  }
  return debugRec(value, '', 'code');
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

type PartiallyRendered = string | Element<any>;

async function* partialRenderStream(
  context: RenderContext,
  renderable: Renderable,
  shouldStop: ElementPredicate
): AsyncGenerator<PartiallyRendered[]> {
  if (typeof renderable === 'string') {
    yield [renderable];
  } else if (typeof renderable === 'number') {
    yield [renderable.toString()];
  } else if (typeof renderable === 'undefined' || typeof renderable === 'boolean' || renderable === null) {
    yield [];
  } else if (Array.isArray(renderable)) {
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
      yield* renderingContext.partialRenderStream(renderable.render(renderingContext), shouldStop);
    }
  } else if (renderable instanceof Promise) {
    yield* await renderable.then((x) => context.partialRenderStream(x, shouldStop));
  } else {
    // Exhaust the iterator.
    for await (const value of renderable) {
      yield* context.partialRenderStream(value, shouldStop);
    }
  }
}

interface ShowOptions {
  stream: boolean;
  step: boolean;
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

export function show(node: Node, opts: ShowOptions | undefined = { stream: true, step: false }) {
  const showLifespanId = uuidv4();

  const renderContext = createRenderContext();
  return log.logPhase({ phase: 'show', level: 'trace', opts, showLifespanId }, async () => {
    if (opts.stream) {
      if (process.env.loglevel) {
        log.warn(
          {},
          'show() called with stream=true, but env var `loglevel` is set. Streaming and console logging at the same time will lead to broken output. As a fallback, show() will not stream.'
        );
        console.log(await renderContext.render(node));
        return;
      }

      const rl = readline.createInterface(process.stdin, process.stdout);
      let lastPage = '';
      const cursor = new readline.Readline(process.stdout);
      for await (const page of renderContext.renderStream(node)) {
        for (const line of lastPage.split('\n').reverse()) {
          cursor.clearLine(0);
          cursor.moveCursor(-line.length, -1);
        }
        cursor.moveCursor(0, 1);
        await cursor.commit();

        rl.write(`${page}\n`);
        lastPage = `${page}\n`;

        if (opts.step) {
          await rl.question('Continue?');
          lastPage += 'Continue?\n';
        }
      }
      rl.close();
      return;
    }

    console.log(await renderContext.render(node));
  });
}

// This may be too invasive for users – we may wish to have more targetted try/catches.
// Maybe we only apply this handler during a show() / render() call?
process.on('unhandledRejection', (reason) => {
  /**
   * Some errors will just show up as {} in the logs. We need to stringify them manually.
   * Maybe https://github.com/watson/stackman? For now, we'll rely on a console log.
   */
  log.error({ reason }, 'Unhandled Rejection');
  console.log(reason);
});
