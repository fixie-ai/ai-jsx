import * as ReactModule from 'react';
import * as AI from './core.js';
import { asJsxBoundary } from './jsx-boundary.js';
export * from './core.js';

function unwrapReact(partiallyRendered: AI.PartiallyRendered): ReactModule.ReactNode {
  if (AI.isElement(partiallyRendered)) {
    // This should be an AI.React element.
    if (partiallyRendered.tag !== AI.React) {
      throw new Error('unwrapReact only expects to see AI.React elements or strings.');
    }

    return partiallyRendered.props.children;
  }

  return partiallyRendered;
}

/**
 * Renders an AI.jsx component into React. Used by the <AI.jsx> element internally but
 * can be used directly an entrypoint into AI.jsx.
 */
export function useAI(children: AI.Node, onStreamStart?: () => void, onStreamEnd?: () => void) {
  const [result, setResult] = ReactModule.useState([] as ReactModule.ReactNode);
  const [isDone, setIsDone] = ReactModule.useState(false);

  ReactModule.useEffect(() => {
    let shouldStop = false;
    async function stream() {
      setResult([]);
      onStreamStart?.();
      setIsDone(false);

      // TODO: add a way for a render context to be aborted
      const renderResult = AI.createRenderContext().render(children, {
        stop: (e) => e.tag == AI.React,
        map: (frame) => frame.map(unwrapReact),
      });
      for await (const reactFrame of renderResult) {
        if (shouldStop) {
          return;
        }

        setResult(reactFrame);
      }

      const final = await renderResult;
      if (shouldStop) {
        return;
      }
      setResult(final.map(unwrapReact));
      onStreamEnd?.();
      setIsDone(true);
    }

    stream();

    return () => {
      onStreamEnd?.();
      shouldStop = true;
    };
  }, [children]);

  return { result, isDone };
}

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

export function useAIStream(onComplete: (result: ReactModule.ReactNode) => ReactModule.ReactNode = (node) => node) {
  const [currentStream, setCurrentStream] = ReactModule.useState<ReadableStream<StreamedObject> | null>(null);
  const [currentUI, setCurrentUI] = ReactModule.useState(null as ReactModule.ReactNode);

  function fetchAI(...fetchArguments: Parameters<typeof fetch>) {
    fetch(...fetchArguments).then((response) => {
      if (response.ok) {
        setCurrentStream(response.body?.pipeThrough(new TextDecoderStream()).pipeThrough(aiTransformer()) ?? null);
      }
    });
  }

  ReactModule.useEffect(() => {
    let shouldStopValue = false;
    const shouldStop = () => shouldStopValue;

    async function readStream() {
      if (currentStream !== null) {
        const reader = currentStream.getReader();
        let currentUI: ReactModule.ReactNode = null;
        while (!shouldStop()) {
          const { done, value } = await reader.read();
          if (value?.type === 'replace') {
            currentUI = value.value;
            setCurrentUI(currentUI);
          }
          if (done) {
            setCurrentStream(null);
            setCurrentUI(onComplete(currentUI));
            break;
          }
        }
        reader.releaseLock();
      }
    }

    readStream();

    return () => {
      shouldStopValue = true;
    };
  }, [currentStream]);

  return {
    current: currentUI,
    fetchAI,
  };
}

/**
 * A JSX component that allows AI.jsx elements to be used in a React component tree.
 */
export const jsx = asJsxBoundary(function jsx(
  {
    children,
    onStreamStart,
    onStreamEnd,
    loading = '',
  }: { children: AI.Node; onStreamStart?: () => void; onStreamEnd?: () => void; loading?: React.ReactNode },
  context?: any | AI.ComponentContext
) {
  if (typeof context?.render === 'function') {
    // We're in AI.JSX already.
    return children;
  }

  const ai = useAI(children, onStreamStart, onStreamEnd);
  const waitingForFirstAIResponse = !ai.isDone && Array.isArray(ai.result) && ai.result.length === 0;

  return ReactModule.createElement(ReactModule.Fragment, null, waitingForFirstAIResponse ? loading : ai.result) as any;
});
