import * as readline from 'readline/promises';
import { log } from './';
import { v4 as uuidv4 } from 'uuid';

const wellKnownComponents = {
  br: function br() {
    return '\n';
  },
};

export const createElementArgs = Symbol();

export type Component = keyof typeof wellKnownComponents | ((props: object, children: Node[]) => Node);
export type Node = string | Promise<Node> | (() => Node) | Node[] | AsyncGenerator<Node>;

function memoize(node: Node): Node {
  if (typeof node === 'string') {
    return node;
  } else if (typeof node === 'function') {
    let value = null;
    let isMemoized = false;

    return () => {
      if (isMemoized) {
        return value;
      }

      value = memoize(node());
      isMemoized = true;
      return value;
    };
  } else if (Array.isArray(node)) {
    return node.map(memoize);
  } else if (node instanceof Promise) {
    return node.then(memoize);
  }
  // It's an async generator (which is mutable). We set up some machinery to buffer the
  // results so that we can create memoized generators as necessary.
  const generator = node;
  const sink: Node[] = [];
  let completed = false;
  let nextPromise: Promise<void> | null = null;

  async function* memoizedGenerator() {
    // Our types are misleading Eslint here.
    /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
    if (generator === null) {
      return '';
    }
    // Our types are misleading Eslint here.
    /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
    if (generator === undefined) {
      throw new Error('Component cannot return undefined. Did you forget a `return`?');
    }
    // console.log('invoke memoizedGenerator', generator)
    let index = 0;
    while (true) {
      if (index < sink.length) {
        yield sink[index++];
        continue;
      } else if (completed) {
        break;
      } else if (nextPromise == null) {
        nextPromise = generator.next().then((result) => {
          if (result.done) {
            completed = true;
          } else {
            sink.push(memoize(result.value));
          }
          nextPromise = null;
        });
      }

      await nextPromise;
    }
  }

  return () => memoizedGenerator();
}

/**
 * Referenced in tscconfig.json.
 */
export function createElement(component: Component, props: object | null, ...children: Node[]): Node {
  const fn = typeof component === 'function' ? component : wellKnownComponents[component];

  const propsToPass = props ?? {};
  const flattenedChildren = children.flat();
  // const bound = () => fn(propsToPass, flattenedChildren);
  const bound = memoize(() => fn(propsToPass, flattenedChildren));
  bound[createElementArgs] = [fn, propsToPass, flattenedChildren];
  return bound;
}

/**
 * Referenced in tsconfig.json
 */
export function Fragment(props, ...children: Node[]): Node {
  return children;
}

export function Debug(node: Node): string {
  // console.log(typeof node, node, Object.keys(node))
  if (typeof node === 'string') {
    return `{${JSON.stringify(node)}}`;
  } else if (typeof node === 'function') {
    if (createElementArgs in node) {
      const [fn, props, children] = (node as any)[createElementArgs];

      const propsString =
        props === null
          ? ''
          : ` ${Object.keys(props)
              .map((key) => `${key}={${JSON.stringify(props[key])}}`)
              .join(' ')}`;
      if (children.length > 0) {
        return `<${fn.name}${propsString}>${Debug(children)}</${fn.name}>`;
      }
      return `<${fn.name}${propsString} />`;
    }
    return '[Function]';
  } else if (Array.isArray(node)) {
    return node.map(Debug).join('');
  } else if (node instanceof Promise) {
    return '[Promise]';
  }
  return '[Generator]';
}

export function GetProps(component: Component, node: Node) {
  if (typeof node === 'function') {
    const [c, props] = node[createElementArgs];
    if (c === component) {
      return props || {};
    }
  }

  return null;
}

function renderNodeToGenerator(node: Node): AsyncGenerator<string> {
  async function* inner() {
    if (typeof node === 'string') {
      yield node;
    } else if (typeof node === 'function') {
      yield* renderNodeToGenerator(node());
    } else if (Array.isArray(node)) {
      if (node.length == 1) {
        yield* renderNodeToGenerator(node[0]);
        return;
      }

      const generators = node.map((n) => renderNodeToGenerator(n));
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
    } else if (node instanceof Promise) {
      yield* renderNodeToGenerator(await node);
    } else {
      for await (const n of node) {
        yield* renderNodeToGenerator(n);
      }
    }
  }

  return log.logGeneratorDuration({ phase: 'renderNodeToGenerator', level: 'trace', node: Debug(node) }, inner());
}

interface ShowOptions {
  stream: boolean;
}
export async function render(node: Node) {
  let finalResult = '';
  for await (const page of renderNodeToGenerator(node)) {
    finalResult = page;
  }
  return finalResult;
}

export function show(node: Node, opts: ShowOptions | undefined = { stream: true }) {
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
      for await (const page of renderNodeToGenerator(node)) {
        for (const line of lastPage.split('\n').reverse()) {
          cursor.clearLine(0);
          cursor.moveCursor(-line.length, -1);
        }
        cursor.moveCursor(0, 1);
        await cursor.commit();

        rl.write(`${page}\n`);
        lastPage = `${page}\n`;
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
