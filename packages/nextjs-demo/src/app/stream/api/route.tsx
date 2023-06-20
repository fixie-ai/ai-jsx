/** @jsxImportSource ai-jsx */
import * as AI from 'ai-jsx/next';
import { NextRequest } from 'next/server';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';

async function* aiJsxToSseJson(renderable: AI.Renderable) {
  const renderContext = AI.createRenderContext();
  const renderResult = renderContext.render(renderable, { map: (x) => x, stop: () => false });
  const asyncIterator = renderResult[Symbol.asyncIterator]();
  while (true) {
    const nextResult = await asyncIterator.next();

    // TODO: diff the current frame with the previous frame.
    yield { type: 'replace', value: nextResult.value };

    if (nextResult.done) {
      break;
    }
  }

  return { type: 'complete' };
}

function aiJsxToSseStream(renderable: AI.Renderable): ReadableStream {
  const generator = aiJsxToSseJson(renderable);
  return new ReadableStream({
    async pull(controller) {
      const next = await generator.next();
      console.log(next.value);
      controller.enqueue(`data: ${JSON.stringify(next.value)}\n\n`);
      if (next.done) {
        controller.close();
      }
    },
  }).pipeThrough(new TextEncoderStream());
}

export async function POST(request: NextRequest) {
  const json = await request.json();
  return new Response(
    aiJsxToSseStream(
      <ChatCompletion>
        <UserMessage>Write a haiku about {json.topic ?? 'foxes'}.</UserMessage>
      </ChatCompletion>
    ),
    {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
      },
    }
  );
}
