import opentelemetry, { SpanStatusCode, context } from '@opentelemetry/api';
import { PartiallyRendered } from './render.js';
import { Element, isElement } from './node.js';
import { debug } from './debug.js';
import { Span, Tracer } from './tracer.js';

class OpenTelemetrySpan extends Span {
  public constructor(
    public readonly opentelemetrySpan: opentelemetry.Span,
    public readonly element: Element<any>,
    public readonly memoizedSubtreeRoot?: OpenTelemetrySpan
  ) {
    super();
    opentelemetrySpan.setAttributes({ 'ai.jsx.tag': element.tag.name, 'ai.jsx.tree': debug(element, true) });
    opentelemetrySpan.setAttribute('ai.jsx.memoized', !!memoizedSubtreeRoot);
  }

  public setAttribute(key: string, value: unknown): void {
    this.opentelemetrySpan.setAttribute(key, (typeof value === 'object' ? JSON.stringify(value) : value) as any);
  }
  public end(status: 'ok', result: PartiallyRendered[]): void;
  public end(status: 'error', exception: unknown): void;
  public end(status: 'ok' | 'error', exceptionOrResult: unknown): void {
    if (status === 'ok') {
      const result = exceptionOrResult as PartiallyRendered[];
      const resultIsPartial = result.find(isElement);
      this.opentelemetrySpan.setAttribute('ai.jsx.result', resultIsPartial ? debug(result, true) : result.join(''));
      this.opentelemetrySpan.setStatus({ code: SpanStatusCode.OK });
    } else if (status === 'error') {
      const exception = exceptionOrResult as unknown;
      this.opentelemetrySpan.setStatus({ code: SpanStatusCode.ERROR, message: `${exception}` });
    }

    this.opentelemetrySpan.end();
  }
}

export class OpenTelemetryTracer extends Tracer<OpenTelemetrySpan> {
  private readonly policy: (element: Element<any>) => boolean;

  public constructor(options?: { policy?: 'all' | 'async' | ((element: Element<any>) => boolean) }) {
    super();
    const policy = options?.policy ?? 'async';
    this.policy = policy === 'async' ? OpenTelemetryTracer.asyncPolicy : policy === 'all' ? () => true : policy;
  }

  private static asyncPolicy(element: Element<any>): boolean {
    // Don't trace synchronous functions, though note that this also means that non-async
    // functions that simply return promises won't be traced.
    return element.tag.constructor !== Function;
  }

  public trace(
    element: Element<any>,
    parent: OpenTelemetrySpan | undefined,
    memoizedSubtreeRoot: OpenTelemetrySpan | undefined,
    fn: (span: OpenTelemetrySpan) => void
  ): void {
    if ((parent && !this.policy(element)) || (memoizedSubtreeRoot && parent?.memoizedSubtreeRoot)) {
      return;
    }

    const tracer = opentelemetry.trace.getTracer('ai.jsx');
    const prefix = memoizedSubtreeRoot ? 'Memoized.' : '';
    tracer.startActiveSpan(
      `<${prefix}${element.tag.name}>`,
      { links: memoizedSubtreeRoot ? [{ context: memoizedSubtreeRoot.opentelemetrySpan.spanContext() }] : [] },
      (span) => fn(new OpenTelemetrySpan(span, element, memoizedSubtreeRoot))
    );
  }

  public bindAsyncGeneratorToActiveContext<T = unknown, TReturn = any, TNext = unknown>(
    generator: AsyncGenerator<T, TReturn, TNext>
  ): AsyncGenerator<T, TReturn, TNext> {
    // Also bind the generator to the OpenTelemetry context.
    const parentGenerator = super.bindAsyncGeneratorToActiveContext(generator);
    const activeContext = context.active();
    const result = {
      next: context.bind(activeContext, parentGenerator.next.bind(parentGenerator)),
      return: context.bind(activeContext, parentGenerator.return.bind(parentGenerator)),
      throw: context.bind(activeContext, parentGenerator.throw.bind(parentGenerator)),

      [Symbol.asyncIterator]() {
        return result;
      },
    };

    return result;
  }
}
