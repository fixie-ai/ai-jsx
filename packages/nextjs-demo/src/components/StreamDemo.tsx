'use client';
import React, { ReactNode, useEffect, useState } from 'react';

type StreamedObject = { type: 'replace'; value: string[] } | { type: 'complete' };

function aiTransformer() {
  const SSE_PREFIX = 'data: ';
  const SSE_TERMINATOR = '\n\n';

  let bufferedContent = '';

  return new TransformStream<string, StreamedObject>({
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

export function StreamDemo() {
  const [currentStream, setCurrentStream] = useState<ReadableStream<StreamedObject> | null>(null);
  const [currentUI, setCurrentUI] = useState<ReactNode>(null);

  useEffect(() => {
    let shouldStop = false;

    async function readStream() {
      if (currentStream !== null) {
        const reader = currentStream.getReader();
        while (!shouldStop) {
          const { done, value } = await reader.read();
          if (value?.type === 'replace') {
            setCurrentUI(value.value);
          }
          shouldStop = done;
        }

        reader.releaseLock();
      }
    }

    readStream();
    return () => {
      shouldStop = true;
    };
  }, [currentStream]);

  return (
    <div>
      <button
        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        onClick={() =>
          fetch('/stream/api').then((r) => {
            if (r.status === 200) {
              setCurrentStream(r.body?.pipeThrough(new TextDecoderStream()).pipeThrough(aiTransformer()) ?? null);
            }
          })
        }
      >
        Go!
      </button>
      <div className="whitespace-pre-line">{currentUI}</div>
    </div>
  );
}
