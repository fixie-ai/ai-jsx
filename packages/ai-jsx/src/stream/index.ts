import {
  isElement as isAIElement,
  Element,
  PartiallyRendered,
  RenderResult,
  Renderable,
  isIndirectNode,
  getReferencedNode,
  createRenderContext,
} from '../index.js';
import { Jsonifiable } from 'type-fest';

/** @hidden */
export type StreamEvent<T> =
  | {
      type: 'all';
      content: T[];
    }
  | { type: 'replace'; index: number; content: T }
  | { type: 'multiple'; events: StreamEvent<T>[] }
  | { type: 'append'; index: number; content: T }
  | { type: 'complete' };

/** @hidden */
export type ElementSerializer = (element: Element<any>) => Jsonifiable;

/** @hidden */
export type Deserialized<T> = string | T | Deserialized<T>[];

/** @hidden */
export type ElementDeserializer<T> = (parsed: Jsonifiable) => T;

/**
 * Render a {@link Renderable} to a stream of {@link StreamEvent}s.
 */
async function* renderToJsonEvents(
  renderResult: RenderResult<PartiallyRendered[], PartiallyRendered[]>
): AsyncGenerator<StreamEvent<PartiallyRendered>, StreamEvent<PartiallyRendered>> {
  const asyncIterator = renderResult[Symbol.asyncIterator]();
  let lastFrame = null as PartiallyRendered[] | null;
  while (true) {
    const { done, value: frame } = await asyncIterator.next();
    if (lastFrame !== null && lastFrame.length === frame.length) {
      const deltas = [] as StreamEvent<PartiallyRendered>[];
      for (let i = 0; i < frame.length; ++i) {
        const previous = lastFrame[i];
        const current = frame[i];

        if (previous === current) {
          // No change.
          continue;
        }

        if (typeof current === 'string' && typeof previous === 'string' && current.startsWith(previous)) {
          // The change was a simple append.
          deltas.push({ type: 'append', index: i, content: current.slice(previous.length) });
          continue;
        }

        deltas.push({ type: 'replace', index: i, content: current });
      }

      if (deltas.length === 1) {
        yield deltas[0];
      } else if (deltas.length > 1) {
        yield { type: 'multiple', events: deltas };
      }
    } else {
      yield { type: 'all', content: frame };
    }

    lastFrame = frame;
    if (done) {
      break;
    }
  }

  return { type: 'complete' };
}

/**
 * Constructs a JSON replacer from an {@link ElementSerializer}. The serializer
 * will only be invoked for AI.JSX Elements. More generally, values with
 * AI.JSX projections (such as combined AI.JSX/React elements) will not be
 * serialized -- only their AI.JSX projections will be.
 * @param serializer A function that can serialize an AI.JSX element.
 * @returns A replacer function that can be passed to JSON.stringify.
 */
function jsonReplacerFromSerializer(serializer: ElementSerializer) {
  return (key: string, value: unknown) => {
    let currentValue: unknown = value;

    if (currentValue !== null && typeof currentValue === 'object') {
      while (isIndirectNode(currentValue)) {
        currentValue = getReferencedNode(currentValue);
      }

      if (isAIElement(currentValue)) {
        return serializer(currentValue);
      }
    }

    return currentValue;
  };
}

/**
 * Generate a stream of JSON-serialized events from a {@link RenderResult}.
 */
export function toEventStream(
  renderResult: RenderResult<PartiallyRendered[], PartiallyRendered[]>
): ReadableStream<StreamEvent<PartiallyRendered>> {
  const generator = renderToJsonEvents(renderResult);
  return new ReadableStream({
    async pull(controller) {
      const next = await generator.next();
      controller.enqueue(next.value);
      if (next.done) {
        controller.close();
      }
    },
  });
}

/**
 * Convert a {@link Renderable} to a {@link Response} that will stream the rendered
 * content as SSE events.
 */
export function toStreamResponse(renderable: Renderable): Response {
  const renderResult = createRenderContext().render(renderable, { stop: () => false, map: (x) => x });
  return new Response(
    toEventStream(renderResult)
      .pipeThrough(
        new TransformStream<StreamEvent<PartiallyRendered>, string>({
          transform(streamEvent, controller) {
            controller.enqueue(`data: ${JSON.stringify(streamEvent)}\n\n`);
          },
        })
      )
      .pipeThrough(new TextEncoderStream()),
    {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
      },
    }
  );
}

/**
 * Convert a {@link Renderable} to a {@link Response} that will stream the rendered
 * content as SSE events.
 */
export function toSerializedStreamResponse(
  renderResult: RenderResult<PartiallyRendered[], PartiallyRendered[]>,
  serializer: ElementSerializer
): Response {
  const jsonReplacer = jsonReplacerFromSerializer(serializer);
  return new Response(
    toEventStream(renderResult)
      .pipeThrough(
        new TransformStream<StreamEvent<PartiallyRendered>, string>({
          transform(streamEvent, controller) {
            controller.enqueue(`data: ${JSON.stringify(streamEvent, jsonReplacer)}\n\n`);
          },
        })
      )
      .pipeThrough(new TextEncoderStream()),
    {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
      },
    }
  );
}

function streamResponseParser<T>(deserializer: ElementDeserializer<T>) {
  const SSE_PREFIX = 'data: ';
  const SSE_TERMINATOR = '\n\n';

  let bufferedContent = '';

  return new TransformStream<string, StreamEvent<T>>({
    transform(chunk, controller) {
      const textToParse = bufferedContent + chunk;
      const eventsWithExtra = textToParse.split(SSE_TERMINATOR);

      // Any content not terminated by a "\n\n" will be buffered for the next chunk.
      const events = eventsWithExtra.slice(0, -1);
      bufferedContent = eventsWithExtra[eventsWithExtra.length - 1] ?? '';

      for (const event of events) {
        if (!event.startsWith(SSE_PREFIX)) {
          continue;
        }
        const text = event.slice(SSE_PREFIX.length);
        controller.enqueue(JSON.parse(text, (key: string, value: Jsonifiable) => deserializer(value) || value));
      }
    },
  });
}

function assembleFromStreamEvents<T>() {
  let previousFrame = [] as (T | string)[];

  // Applies the delta event to the previous frame to update it.
  function applyEvent(event: StreamEvent<T | string>): boolean {
    switch (event.type) {
      case 'all':
        previousFrame = event.content;
        return true;
      case 'replace':
        previousFrame[event.index] = event.content;
        return true;
      case 'append':
        previousFrame[event.index] = (previousFrame[event.index] as string) + event.content;
        return true;
      case 'multiple':
        return event.events.reduce((didChange, subEvent) => applyEvent(subEvent) || didChange, false);
      case 'complete':
        return false;
    }
  }

  return new TransformStream<StreamEvent<T>, Deserialized<T>>({
    transform(event, controller) {
      if (applyEvent(event)) {
        controller.enqueue(previousFrame.slice());
      }
    },
  });
}

/**
 * Converts an SSE response stream (such as one returned from `toStreamResponse`) into
 * a stream of (complete) AI.JSX frames.
 * @param stream The SSE response stream of bytes.
 * @returns A stream of AI.JSX frames.
 */
export function fromStreamResponse<T>(
  stream: ReadableStream<Uint8Array>,
  deserializer: ElementDeserializer<T>
): ReadableStream<Deserialized<T>> {
  return stream
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(streamResponseParser(deserializer))
    .pipeThrough(assembleFromStreamEvents());
}
