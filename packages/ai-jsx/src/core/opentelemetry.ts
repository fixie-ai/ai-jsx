import opentelemetry, { SpanContext, SpanStatusCode, context, createContextKey } from '@opentelemetry/api';
import { PartiallyRendered, StreamRenderer } from './render.js';
import { Element, isElement } from './node.js';
import { memoizedIdSymbol } from './memoize.js';
import { debug } from './debug.js';

function bindAsyncGeneratorToActiveContext<T = unknown, TReturn = any, TNext = unknown>(
  generator: AsyncGenerator<T, TReturn, TNext>
): AsyncGenerator<T, TReturn, TNext> {
  const activeContext = context.active();
  const result = {
    next: context.bind(activeContext, generator.next.bind(generator)),
    return: context.bind(activeContext, generator.return.bind(generator)),
    throw: context.bind(activeContext, generator.throw.bind(generator)),

    [Symbol.asyncIterator]() {
      return result;
    },
  };

  return result;
}

// Tracks all memoized subtrees that are being actively traced.
const memoizedIdsToActiveSpanContexts = new Map<number, SpanContext>();

interface MemoizedIdAndOwner {
  id: number;
  isOwner: boolean;
}

// Indicates whether the current async context is responsible for tracing the memoized subtree.
const activeMemoizedIdStorage = createContextKey('The active MemoizedIdAndOwner');

function spanAttributesForElement(element: Element<any>): opentelemetry.Attributes {
  return { 'ai.jsx.tag': element.tag.name, 'ai.jsx.tree': debug(element, true) };
}

export function openTelemetryStreamRenderer(streamRenderer: StreamRenderer): StreamRenderer {
  const tracer = opentelemetry.trace.getTracer('ai.jsx');

  return (renderContext, renderable, shouldStop, appendOnly) => {
    if (!isElement(renderable)) {
      return streamRenderer(renderContext, renderable, shouldStop, appendOnly);
    }

    const activeContext = context.active();
    let startup = (_span: opentelemetry.Span) => {};
    let cleanup = (_span: opentelemetry.Span) => {};
    const renderInSpan = (span: opentelemetry.Span) => {
      async function* gen() {
        let result: PartiallyRendered[] | undefined = undefined;
        try {
          result = yield* streamRenderer(renderContext, renderable, shouldStop, appendOnly);
          return result;
        } catch (ex) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: `${ex}` });
          throw ex;
        } finally {
          span.setStatus({ code: SpanStatusCode.OK });
          if (result) {
            // Record the rendered value.
            span.setAttribute('ai.jsx.result', result.find(isElement) ? debug(result, true) : result.join(''));
          }
          cleanup(span);
          span.end();
        }
      }

      startup(span);
      return bindAsyncGeneratorToActiveContext(gen());
    };

    // Memoized subtrees can be misleading/overwhelming in traces because multiple renders might
    // be blocked on the same memoized render. So we track actively rendered memoized subtrees
    // and assign the first renderer to be the "owner" -- only that render will emit the full
    // trace for the subtree. Subsequent renders will emit a top-level "(Memoized) <Element>"
    // span but not the entire subtree.
    if (memoizedIdSymbol in renderable.props) {
      const memoizedId = renderable.props[memoizedIdSymbol];
      const activeSpanContext = memoizedIdsToActiveSpanContexts.get(memoizedId);
      if (!activeSpanContext) {
        // Nothing is currently tracing this memoized subtree.
        startup = (span) => memoizedIdsToActiveSpanContexts.set(memoizedId, span.spanContext());
        cleanup = () => memoizedIdsToActiveSpanContexts.delete(memoizedId);
        const newContext = activeContext.setValue(activeMemoizedIdStorage, { id: memoizedId, isOwner: true });
        return context.with(newContext, () =>
          tracer.startActiveSpan(
            `<${renderable.tag.name}>`,
            { attributes: spanAttributesForElement(renderable) },
            renderInSpan
          )
        );
      }

      const activeMemoizedIdAndOwner = activeContext.getValue(activeMemoizedIdStorage) as
        | MemoizedIdAndOwner
        | undefined;
      if (activeMemoizedIdAndOwner === undefined || activeMemoizedIdAndOwner.id !== memoizedId) {
        // We're entering a memoized subtree that's already being actively rendered. Create a
        // span that shows that we're blocked on the memoized subtree.
        const newContext = context.active().setValue(activeMemoizedIdStorage, { id: memoizedId, isOwner: false });
        return context.with(newContext, () =>
          tracer.startActiveSpan(
            `<Memoized.${renderable.tag.name}>`,
            {
              attributes: { 'ai.jsx.memoized': true, ...spanAttributesForElement(renderable) },
              links: [{ context: activeSpanContext }],
            },
            renderInSpan
          )
        );
      }

      if (!activeMemoizedIdAndOwner.isOwner) {
        // This memoized subtree is already being traced, we've already entered the subtree, and we're not the owner.
        // Don't duplicate the trace.
        return streamRenderer(renderContext, renderable, shouldStop, appendOnly);
      }
    }

    // Emit a span for the element.
    return tracer.startActiveSpan(
      `<${renderable.tag.name}>`,
      { attributes: spanAttributesForElement(renderable) },
      renderInSpan
    );
  };
}
