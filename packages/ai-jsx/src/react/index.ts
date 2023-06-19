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
