import { v4 } from 'uuid';
import { AbortEvent, ErrorEvent, CompleteEvent, RenderEvents } from './render-events.js';
import {
  Node,
  ComponentContext,
  Context,
  LogContext,
  RenderContext,
  RenderElement,
  RenderNode,
  Renderable,
} from './render3.js';
import * as Symbols from './symbols.js';

export class RenderElementImpl extends EventTarget implements RenderElement {
  public readonly [Symbols.IsRenderElement]: true = true;
  private readonly children: RenderNode[] = [];
  private readonly errorPromise: Promise<never>;

  private asyncIterator: AsyncIterator<RenderNode> | null = null;
  private nextPromise: Promise<void> | null = null;
  private incompleteChildren: number = 0;

  constructor(
    readonly type: string | symbol,
    readonly attributes: Record<string | symbol, any>,
    readonly renderContext: RenderContext,
    readonly abortSignal: AbortSignal | undefined,
    children: undefined | RenderNode | RenderNode[] | AsyncIterable<RenderNode>
  ) {
    super();

    this.errorPromise = new Promise<never>((_, reject) => {
      abortSignal?.addEventListener('abort', () => {
        this.dispatchEvent(new AbortEvent());
        this.asyncIterator?.throw?.(new Error('Render aborted'));
        reject(new Error('Render aborted'));
      });

      this.addEventListener('error', (e) => {
        reject(e.error);
      });
    });

    if (children) {
      if (Array.isArray(children)) {
        children.forEach((c) => this.addChild(c));
      } else if (typeof children === 'object' && Symbol.asyncIterator in children) {
        this.asyncIterator = children[Symbol.asyncIterator]();
      } else {
        this.addChild(children);
      }
    }

    // Rendering continues ahead even without anything waiting for the children to complete.
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of this.asyncChildNodes) {
        // Do nothing, just drive the iterator forward.
      }
    })().catch(() => {});
  }

  private addChild(child: RenderNode) {
    this.children.push(child);
    if (typeof child !== 'string' && !child.isComplete()) {
      ++this.incompleteChildren;
      child.addEventListener('complete', () => {
        --this.incompleteChildren;
        this.checkComplete();
      });
      child.addEventListener('error', (e) => this.dispatchEvent(new ErrorEvent(e.error, e.source)));
    }
  }

  private checkComplete() {
    if (this.incompleteChildren === 0 && this.asyncIterator === null) {
      this.dispatchEvent(new CompleteEvent());
    }
  }

  addEventListener<E extends keyof RenderEvents>(type: E, listener: (e: RenderEvents[E]) => void): void {
    super.addEventListener(type, listener as any);
  }
  removeEventListener<E extends keyof RenderEvents>(type: E, listener: (e: RenderEvents[E]) => void): void {
    super.removeEventListener(type, listener as any);
  }

  get childNodes() {
    return this.children;
  }

  isComplete(local?: boolean): boolean {
    return this.asyncIterator === null && (local || this.incompleteChildren === 0);
  }

  async untilComplete(local?: boolean): Promise<RenderElement> {
    if (this.isComplete(local)) {
      return this;
    }

    for await (const child of this.asyncChildNodes) {
      if (!local && typeof child !== 'string' && !child.isComplete()) {
        await child.untilComplete();
      }
    }

    return this;
  }

  [Symbol.asyncIterator](): AsyncIterator<string> {
    async function* toStringIterable(renderNode: RenderNode, parentBuffer: string[] | null): AsyncGenerator<string> {
      // We only want to yield whenever we need to block on an async child, so buffer the strings until we need to block.
      if (typeof renderNode === 'string') {
        if (parentBuffer !== null) {
          parentBuffer.push(renderNode);
        } else {
          yield renderNode;
        }
        return;
      }

      const localBuffer = parentBuffer ?? [];
      function* flushBuffer() {
        const flushed = localBuffer.splice(0, localBuffer.length).join('');
        if (flushed.length > 0) {
          yield flushed;
        }
      }

      // Gather up as much as we can synchronously.
      let childNodesCount = 0;
      for (const child of renderNode.childNodes) {
        childNodesCount++;
        yield* toStringIterable(child, localBuffer);
      }

      if (!renderNode.isComplete(true)) {
        // We're going to block on the async children, so flush the buffer.
        yield* flushBuffer();

        let asyncChildNodesCount = 0;
        for await (const child of renderNode.asyncChildNodes) {
          asyncChildNodesCount++;
          if (asyncChildNodesCount <= childNodesCount) {
            // We already saw this child previously.
            continue;
          }
          yield* toStringIterable(child, localBuffer);

          if (!renderNode.isComplete(true)) {
            yield* flushBuffer();
          }
        }
      }

      // If we own the buffer, flush it.
      if (localBuffer !== parentBuffer) {
        yield* flushBuffer();
      }
    }

    return toStringIterable(this, null);
  }

  get asyncChildNodes() {
    const _this = this;
    return (async function* asyncChildNodes() {
      let index = 0;
      while (true) {
        while (index < _this.children.length) {
          yield _this.children[index];
          index++;
        }

        if (_this.asyncIterator === null) {
          break;
        }

        if (_this.nextPromise) {
          await Promise.race([_this.errorPromise, _this.nextPromise]);
        } else {
          _this.nextPromise = _this.asyncIterator.next().then(
            ({ value, done: isDone }) => {
              if (isDone) {
                _this.asyncIterator = null;
                _this.checkComplete();
              } else {
                _this.addChild(value);
              }
              _this.nextPromise = null;
            },
            (err) => {
              _this.dispatchEvent(new ErrorEvent(err, _this));
              throw err;
            }
          );
        }
      }
    })();
  }

  toString(): string {
    function addStringChunks(renderNode: RenderNode, chunks: string[]): string[] {
      if (typeof renderNode === 'string') {
        chunks.push(renderNode);
        return chunks;
      }

      for (const child of renderNode.childNodes) {
        addStringChunks(child, chunks);
      }

      return chunks;
    }

    return addStringChunks(this, []).join('');
  }

  async toStringAsync(): Promise<string> {
    const chunks: string[] = [];
    for await (const chunk of this) {
      chunks.push(chunk);
    }
    return chunks.join('');
  }
}

export class RenderContextImpl implements RenderContext {
  constructor(private readonly userContext: Record<symbol, unknown>) {}
  render(renderable: Renderable, abortSignal?: AbortSignal): RenderElement {
    const result = this.renderInternal(renderable, abortSignal);
    return typeof result === 'string' ? new RenderElementImpl(Symbols.Fragment, {}, this, abortSignal, result) : result;
  }

  private renderInternal(renderable: Renderable, abortSignal?: AbortSignal | undefined): RenderNode {
    const renderContext = this;
    switch (typeof renderable) {
      case 'string':
        return renderable;
      case 'number':
        return renderable.toString();
      case 'boolean':
      case 'undefined':
      case 'symbol':
        return '';
      case 'object':
        break;
      case 'function': {
        const logImplementation = this.getContext(LogContext);
        const renderId = v4();
        try {
          const result = this.renderInternal(
            renderable({
              render: (renderable: Renderable, abortSignal?: AbortSignal) => this.render(renderable, abortSignal),
              attach: (node: Node) => this.attach(node),
              getContext: <T>(ctx: Context<T>) => this.getContext(ctx),
              setContext: <T>(ctx: Context<T>, value: T) => this.setContext(ctx, value),
              logger: logImplementation.bind(renderable.tag, renderable.props, renderId),
              abortSignal,
            }),
            abortSignal
          );
          if (typeof result !== 'string') {
            result.addEventListener('error', (e) =>
              logImplementation.logException(renderable.tag, renderable.props, renderId, e.error, e.source !== result)
            );
          }

          return result;
        } catch (e) {
          logImplementation.logException(
            renderable.tag,
            renderable.props,
            renderId,
            e instanceof Error ? e : new Error(`${e}`),
            false
          );

          // Embed the error in the render tree.
          return new RenderElementImpl(
            Symbols.Error,
            { error: e },
            this,
            abortSignal,
            (async function* () {
              throw e;
              yield '';
            })()
          );
        }
      }
      default: {
        const shouldBeNever: never = renderable;
        throw new TypeError(`Unsupported literal type: ${shouldBeNever}`);
      }
    }

    if (renderable === null) {
      return '';
    }

    if (Symbols.IsRenderElement in renderable) {
      return renderable;
    }

    if (Array.isArray(renderable)) {
      return new RenderElementImpl(
        Symbols.Fragment,
        {},
        this,
        abortSignal,
        renderable.flat(Infinity as 1).map((child) => renderContext.renderInternal(child))
      );
    }

    if ('then' in renderable) {
      const awaitable = renderable.then((value) => renderContext.renderInternal(value, abortSignal));
      return new RenderElementImpl(
        Symbols.Async,
        {},
        this,
        abortSignal,
        (async function* () {
          yield await awaitable;
        })()
      );
    }

    if (Symbol.asyncIterator in renderable) {
      return new RenderElementImpl(
        Symbols.Stream,
        {},
        this,
        abortSignal,
        (async function* () {
          for await (const value of renderable) {
            yield renderContext.renderInternal(value, abortSignal);
          }
        })()
      );
    }

    throw new TypeError(`Unsupported renderable type: ${renderable}`);
  }
  attach(node: Node): Node {
    return (ctx: ComponentContext) => this.render(node, ctx.abortSignal);
  }
  getContext<T>(ctx: Context<T>): T {
    return ctx.symbol in this.userContext ? (this.userContext[ctx.symbol] as T) : ctx.default;
  }
  setContext<T>(ctx: Context<T>, value: T): RenderContext {
    return new RenderContextImpl({ ...this.userContext, [ctx.symbol]: value });
  }
}
