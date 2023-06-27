import { PartiallyRendered, Renderable, createRenderContext } from '../index.js';

export type StreamEvent =
  | {
      type: 'all';
      content: PartiallyRendered[];
    }
  | { type: 'replace'; index: number; content: PartiallyRendered }
  | { type: 'multiple'; events: StreamEvent[] }
  | { type: 'append'; index: number; content: string }
  | { type: 'complete' };

/**
 * Render a {@link Renderable} to a stream of {@link StreamEvent}s.
 */
async function* renderToJsonEvents(renderable: Renderable): AsyncGenerator<StreamEvent, StreamEvent> {
  const renderContext = createRenderContext();
  const renderResult = renderContext.render(renderable, { map: (x) => x, stop: () => false });
  const asyncIterator = renderResult[Symbol.asyncIterator]();
  let lastFrame = null as PartiallyRendered[] | null;
  while (true) {
    const { done, value: frame } = await asyncIterator.next();
    if (lastFrame !== null && lastFrame.length === frame.length) {
      const deltas = [] as StreamEvent[];
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

        // Replace the index.
        deltas.push({ type: 'replace', index: i, content: current });
      }

      if (deltas.length === 1) {
        yield deltas[0];
      } else if (deltas.length > 1) {
        yield { type: 'multiple', events: deltas };
      }
    } else {
      yield { type: 'all', content: frame } as StreamEvent;
    }

    lastFrame = frame;
    if (done) {
      break;
    }
  }

  return { type: 'complete' } as StreamEvent;
}

/**
 * Generate a stream of SSE events from a {@link Renderable}.
 */
export function toEventStream(renderable: Renderable): ReadableStream<StreamEvent> {
  const generator = renderToJsonEvents(renderable);
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
  return new Response(
    toEventStream(renderable)
      .pipeThrough(
        new TransformStream<StreamEvent, string>({
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
 * Converts a {@link Renderable} to a {@link ReadableStream} that will stream the rendered
 * content as UTF-8 encoded text.
 */
export function toTextStream(renderable: Renderable): ReadableStream<Uint8Array> {
  let previousValue = '';
  const generator = createRenderContext().render(renderable, { appendOnly: true })[Symbol.asyncIterator]();
  return new ReadableStream({
    async pull(controller) {
      const next = await generator.next();
      const delta = next.value.slice(previousValue.length);
      controller.enqueue(delta);
      previousValue = next.value;

      if (next.done) {
        controller.close();
      }
    },
  }).pipeThrough(new TextEncoderStream());
}

function streamResponseParser() {
  const SSE_PREFIX = 'data: ';
  const SSE_TERMINATOR = '\n\n';

  let bufferedContent = '';

  return new TransformStream<string, StreamEvent>({
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
        controller.enqueue(JSON.parse(text));
      }
    },
  });
}

function assembleFromStreamEvents() {
  let previousFrame = [] as PartiallyRendered[];

  // Applies the delta event to the previous frame to update it.
  function applyEvent(event: StreamEvent): boolean {
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

  return new TransformStream<StreamEvent, PartiallyRendered[]>({
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
export function fromStreamResponse(stream: ReadableStream<Uint8Array>): ReadableStream<PartiallyRendered[]> {
  return stream
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(streamResponseParser())
    .pipeThrough(assembleFromStreamEvents());
}
