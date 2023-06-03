import { log } from './index.js';
import { isMemoizedSymbol } from './memoize.js';

export type Component<P> = (props: P, renderContext: RenderContext) => Renderable;
export type Literal = string | number | null | undefined | boolean;
export interface Element<P extends {}> {
  tag: Component<P>;
  props: P;
  render: (renderContext: RenderContext) => Renderable;
}
export type Node = Element<any> | Literal | Node[];

export type Renderable = Node | Promise<Renderable> | AsyncGenerator<Renderable>;

export type ElementPredicate = (e: Element<any>) => boolean;
export type PropsOfComponent<T extends Component<any>> = T extends Component<infer P> ? P : never;

export interface RenderContext {
  partialRenderStream(renderable: Renderable, shouldStop: ElementPredicate): AsyncGenerator<PartiallyRendered[]>;
  partialRender(renderable: Renderable, shouldStop: ElementPredicate): Promise<PartiallyRendered[]>;
  renderStream(renderable: Renderable): AsyncGenerator<string>;
  render(renderable: Renderable): Promise<string>;
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

export function debug(value: unknown): string {
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
      if (!isMemoized || !memoizedIsPreviouslyRenderedToDebugOutput) {
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
      yield [renderable];
    } else {
      yield* context.partialRenderStream(renderable.render(context), shouldStop);
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
      // console.error(e, renderable);
      log.error({ e, renderable }, 'Error while rendering');
    }
  }
}

async function partialRender(
  context: RenderContext,
  renderable: Renderable,
  shouldStop: ElementPredicate
): Promise<PartiallyRendered[]> {
  let lastValue: PartiallyRendered[] = [];
  for await (const value of context.partialRenderStream(renderable, shouldStop)) {
    lastValue = value;
  }
  return lastValue;
}

async function render(context: RenderContext, renderable: Renderable): Promise<string> {
  console.log({renderable}, 'got renderable');
  const elementsOrStrings = await context.partialRender(renderable, () => false);
  return elementsOrStrings.join('');
}

async function* renderStream(context: RenderContext, renderable: Renderable): AsyncGenerator<string> {
  for await (const value of context.partialRenderStream(renderable, () => false)) {
    yield value.join('');
  }
}

export function createRenderContext(): RenderContext {
  const context: RenderContext = {
    partialRenderStream: (renderable, shouldStop) => partialRenderStream(context, renderable, shouldStop),
    partialRender: (renderable, shouldStop) => partialRender(context, renderable, shouldStop),
    renderStream: (renderable) => renderStream(context, renderable),
    render: (renderable) => render(context, renderable),
  };

  return context;
}

export function show(...args: any[]) {
  throw new Error('show is not implemented. Switch to use Inspector.');
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
