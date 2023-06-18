import * as ReactModule from 'react';
import * as LLMx from '../index.js';
import { Serialize } from './serialize.js';
export * from '../index.js';

export declare namespace JSX {
  // N.B. With this, all JSX elements will be assumed to be _both_ React and AI.jsx elements,
  // even though components generally only function as one or the other.
  type ElementType = ReactModule.JSX.ElementType | LLMx.JSX.ElementType | typeof React | typeof jsx;
  type Element = ReactModule.JSX.Element & LLMx.Node;
  type IntrinsicElements = ReactModule.JSX.IntrinsicElements;
  type ElementChildrenAttribute = ReactModule.JSX.ElementChildrenAttribute & LLMx.JSX.ElementChildrenAttribute;
}

/**
 * Creates an element that can be used either as a React or AI.jsx element. Used as the JSX factory.
 */
export function createElement(...args: Parameters<typeof ReactModule.createElement>) {
  const tag = args[0];
  const reactElement = ReactModule.createElement(...args);
  const aiElement = LLMx.createElement(
    tag === ReactModule.Fragment ? LLMx.Fragment : (tag as any),
    args[1] as any,
    ...args.slice(2)
  );
  return LLMx.makeIndirectNode(reactElement, aiElement);
}

/**
 * The component to use for JSX fragments.
 */
export const Fragment = ReactModule.Fragment;

function unwrapReact(partiallyRendered: LLMx.PartiallyRendered): ReactModule.ReactNode {
  if (LLMx.isElement(partiallyRendered)) {
    // This should be an AI.React element.
    if (partiallyRendered.tag !== React) {
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
export function useAI(children: LLMx.Node, onStreamStart?: () => void, onStreamEnd?: () => void) {
  const [result, setResult] = ReactModule.useState([] as ReactModule.ReactNode);
  const [isDone, setIsDone] = ReactModule.useState(false);

  ReactModule.useEffect(() => {
    let shouldStop = false;
    async function stream() {
      setResult([]);
      onStreamStart?.();
      setIsDone(false);

      // TODO: add a way for a render context to be aborted
      const renderResult = LLMx.createRenderContext().render(children, {
        stop: (e) => e.tag == React,
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
export function jsx(
  {
    children,
    onStreamStart,
    onStreamEnd,
    loading = '',
  }: { children: LLMx.Node; onStreamStart?: () => void; onStreamEnd?: () => void; loading?: React.ReactNode },
  context?: any | LLMx.ComponentContext
) {
  if (typeof context?.render === 'function') {
    // We're in AI.JSX already.
    return children;
  }

  const ai = useAI(children, onStreamStart, onStreamEnd);
  const waitingForFirstAIResponse = !ai.isDone && Array.isArray(ai.result) && ai.result.length === 0;

  return ReactModule.createElement(ReactModule.Fragment, null, waitingForFirstAIResponse ? loading : ai.result) as any;
}

/**
 * A JSX component that allows React elements to be used in an AI.jsx component tree. If
 * the React components are forced to be rendered to a string within AI.jsx, they will be
 * serialized into a JSX string.
 */
export function React({ children }: { children: ReactModule.ReactNode }, context?: any | LLMx.ComponentContext) {
  if (typeof context?.render === 'function') {
    // We're in AI.JSX; serialize the React.
    return LLMx.createElement(Serialize, null, children) as JSX.Element;
  }

  return children;
}
