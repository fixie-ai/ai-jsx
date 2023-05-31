import * as readline from 'readline/promises';
import { log } from './';
import { v4 as uuidv4 } from 'uuid';

export type Component<P> = (props: P) => Renderable;
export type Literal = string | number | null | undefined | boolean;
export interface Element<P> {
  tag: Component<P>;
  props: P;
}
export type Node = Element<any> | Literal | Node[];

export type Renderable = Node | Promise<Renderable> | AsyncGenerator<Renderable>;

export type ElementSelector = (e: Element<any>) => boolean;

export declare namespace JSX {
  interface ElementChildrenAttribute {
    children: {};
  }
}

export function createElement<T extends Component<P>, P extends { children: C }, C>(
  tag: T,
  props: Omit<P, 'children'>,
  child: C
): Element<P>;
export function createElement<T extends Component<P>, P extends { children: C[] }, C>(
  tag: T,
  props: Omit<P, 'children'>,
  ...children: C[]
): Element<P>;
export function createElement(tag: any, props: any, ...children: any[]): Element<any> {
  const propsToPass = {
    ...(props ?? {}),
    children: children.length == 1 ? children[0] : children,
  };

  const result = {
    tag,
    props: propsToPass,
  };
  Object.freeze(propsToPass);
  Object.freeze(result);
  return result;
}

export function isElement(value: Renderable): value is Element<any> {
  return value !== null && typeof value === 'object' && 'tag' in value;
}

export function Fragment({ children }: { children: Node }): Renderable {
  return children;
}

export function debug(value: any, indent: string = '', context: 'code' | 'children' | 'props' = 'code'): string {
  const type = typeof value;
  switch (type) {
    case 'string':
      if (context === 'props' || context === 'code') {
        return JSON.stringify(value);
      }
      return `{${JSON.stringify(value)}}`;

    case 'number':
    case 'bigint':
      if (context === 'props' || context === 'children') {
        return `{${value.toString()}}`;
      }
      return value.toString();

    case 'boolean':
    case 'undefined':
      return '';
    case 'object':
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
        const children = debug(value.props.children, childIndent, 'children');

        const results = [];
        if (value.props) {
          for (const key of Object.keys(value.props)) {
            const propValue = value.props[key];
            if (key === 'children' || propValue === undefined) {
              continue;
            } else {
              results.push(` ${key}=${debug(propValue, indent, 'props')}`);
            }
          }
        }

        const propsString = results.join('');

        let child: string;
        if (children !== '') {
          child = `<${tag}${propsString}>\n${childIndent}${children}\n${indent}</${tag}>`;
        } else if (value.tag !== Fragment) {
          child = `<${tag}${propsString} />`;
        } else {
          child = '<></>';
        }
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
        const values = value.filter(filter).map((v) => debug(v, indent, context === 'children' ? 'children' : 'code'));
        switch (context) {
          case 'children':
            return values.join(`\n${indent}`);
          case 'props':
            return `{[${values.join(', ')}]}`;
          case 'code':
            return `[${values.join(', ')}]`;
        }
      } else {
        if (context === 'props' || context === 'children') {
          return `{${JSON.stringify(value)}}`;
        }
        return JSON.stringify(value);
      }
      break;
    case 'function':
    case 'symbol':
      if (context === 'props' || context === 'children') {
        return `{${value}}`;
      }
      return value.toString();
  }

  return '';
}

export async function partialRender(
  renderable: Renderable,
  shouldStop: ElementSelector
): Promise<(string | Element<any>)[]> {
  if (typeof renderable === 'string') {
    return [renderable];
  } else if (typeof renderable === 'number') {
    return [renderable.toString()];
  } else if (typeof renderable === 'undefined' || typeof renderable === 'boolean' || renderable === null) {
    return [];
  } else if (Array.isArray(renderable)) {
    const rendered = await Promise.all(renderable.map((r) => partialRender(r, shouldStop)));
    return rendered.flat();
  } else if (isElement(renderable)) {
    if (shouldStop(renderable)) {
      return [renderable];
    }
    const rendered = renderable.tag(renderable.props);
    return partialRender(rendered, shouldStop);
  } else if (renderable instanceof Promise) {
    return renderable.then((r) => partialRender(r, shouldStop));
  }
  // Exhaust the iterator.
  let lastValue: Renderable = '';
  for await (const value of renderable as any) {
    lastValue = value;
  }
  return partialRender(lastValue, shouldStop);
}

export async function render(renderable: Renderable): Promise<string> {
  const elementsOrStrings = await partialRender(renderable, () => false);
  return elementsOrStrings.join('');
}

async function* renderGenerator(renderable: Renderable): AsyncGenerator<string> {
  // TODO: combine with partialRender
  if (typeof renderable === 'string') {
    yield renderable;
  } else if (typeof renderable === 'number') {
    yield renderable.toString();
  } else if (typeof renderable === 'boolean' || typeof renderable === 'undefined' || renderable === null) {
    yield '';
  } else if (Array.isArray(renderable)) {
    const generators = renderable.map(renderGenerator);
    const currentValues: string[] = generators.map(() => '');
    const finished = generators.map(() => false);
    const nextPromise = (g: AsyncGenerator) =>
      g.next().then((x) => [g, x] as [AsyncGenerator<string>, IteratorResult<string>]);
    const promises = generators.map(nextPromise);

    while (finished.includes(false)) {
      yield currentValues.join('');
      const [generator, value] = await Promise.race(promises);
      const index = generators.indexOf(generator);

      if (value.done) {
        finished[index] = true;
        promises[index] = new Promise(() => false);
      } else {
        currentValues[index] = value.value;
        promises[index] = nextPromise(generator);
      }
    }

    yield currentValues.join('');
  } else if (renderable instanceof Promise) {
    yield* renderGenerator(await (renderable as any));
  } else if (isElement(renderable)) {
    yield* renderGenerator(renderable.tag(renderable.props));
  } else {
    for await (const n of renderable) {
      yield* renderGenerator(n);
    }
  }
}

interface ShowOptions {
  stream: boolean;
  step: boolean;
}

export function show(node: Node, opts: ShowOptions | undefined = { stream: true, step: false }) {
  const showLifespanId = uuidv4();
  return log.logPhase({ phase: 'show', level: 'trace', opts, showLifespanId }, async () => {
    if (opts.stream) {
      if (process.env.loglevel) {
        log.warn(
          {},
          'show() called with stream=true, but env var `loglevel` is set. Streaming and console logging at the same time will lead to broken output. As a fallback, show() will not stream.'
        );
        console.log(await render(node));
        return;
      }

      const rl = readline.createInterface(process.stdin, process.stdout);
      let lastPage = '';
      const cursor = new readline.Readline(process.stdout);
      for await (const page of renderGenerator(node)) {
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

    console.log(await render(node));
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
