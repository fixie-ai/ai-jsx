import * as ReactModule from 'react';
import * as LLMx from './index.js';
export * from './index.js';

export declare namespace JSX {
  type ElementType = React.JSX.ElementType | LLMx.JSX.ElementType;
  type Element = React.JSX.Element & LLMx.Node;
  type IntrinsicElements = React.JSX.IntrinsicElements;
  type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute & LLMx.JSX.ElementChildrenAttribute;
}

export function createElement(...args: Parameters<typeof ReactModule.createElement>) {
  const tag = args[0];
  const reactElement = ReactModule.createElement(...args);
  const indirectNode = LLMx.createElement(
    tag === ReactModule.Fragment ? LLMx.Fragment : (tag as any),
    args[1] as any,
    ...args.slice(2)
  );
  LLMx.setIndirectNode(reactElement, indirectNode);
  return reactElement;
}

export const Fragment = ReactModule.Fragment;

export function useAI(children: LLMx.Node, when: boolean = true) {
  const isInProgressRef = ReactModule.useRef(false);
  const mostRecentlyRenderedChildren = ReactModule.useRef(children);
  // If `children` changes, but a previous call is still in progress, will we properly start a new one?
  const [result, setResult] = ReactModule.useState([] as ReactModule.ReactNode);
  const [isDone, setIsDone] = ReactModule.useState(false);

  ReactModule.useEffect(() => {
    if (isInProgressRef.current || !when) {
      return;
    }
    setResult([]);
    setIsDone(false);
    LLMx.createRenderContext()
      .render(children, {
        // Streaming won't work. We see this error in the console:
        // xhr.js:174 The provided value 'stream' is not a valid enum value of type XMLHttpRequestResponseType.
        map: (frame) => setResult(frame as ReactModule.ReactNode),
        stop: (e) => e.tag.name.startsWith('Recipe'),
      })
      .then((frame) => {
        isInProgressRef.current = false;
        mostRecentlyRenderedChildren.current = children;
        setResult(frame as ReactModule.ReactNode);
        setIsDone(true);
      });
  }, [children, when]);

  // It seems like there should be a better way to do this.
  const isActuallyDone = mostRecentlyRenderedChildren.current === children && isDone;

  return { result, isDone: isActuallyDone };
}

export function jsx({ children }: { children: JSX.Element }, context?: any | LLMx.ComponentContext): JSX.Element {
  if (typeof context?.render === 'function') {
    // We're in AI.JSX already.
    return children;
  }

  const ai = useAI(children);
  return ReactModule.createElement(ReactModule.Fragment, null, ai.result) as any;
}

export function React({ children }: { children: JSX.Element }) {
  return children;
}
