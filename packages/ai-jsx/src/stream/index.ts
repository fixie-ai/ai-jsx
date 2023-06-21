import { PartiallyRendered, Renderable, createRenderContext } from '../index.js';

export type StreamEvent =
  | {
      type: 'replace';
      content: PartiallyRendered[];
    }
  | { type: 'complete' };

/**
 * Render a {@link Renderable} to a stream of {@link StreamEvent}s.
 */
async function* renderToJsonEvents(renderable: Renderable) {
  const renderContext = createRenderContext();
  const renderResult = renderContext.render(renderable, { map: (x) => x, stop: () => false });
  const asyncIterator = renderResult[Symbol.asyncIterator]();
  while (true) {
    const nextResult = await asyncIterator.next();

    // TODO: diff the current frame with the previous frame.
    yield { type: 'replace', content: nextResult.value } as StreamEvent;

    if (nextResult.done) {
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
  return new TransformStream<StreamEvent, PartiallyRendered[]>({
    transform(chunk, controller) {
      if (chunk.type === 'replace') {
        controller.enqueue(chunk.content);
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
