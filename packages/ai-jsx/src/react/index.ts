import * as ReactModule from 'react';
import * as LLMx from '../index.js';
import { Serialize } from './serialize.js';
export * from '../index.js';

export declare namespace JSX {
  type ElementType = ReactModule.JSX.ElementType | LLMx.JSX.ElementType | typeof React | typeof jsx;
  type Element = ReactModule.JSX.Element & LLMx.Node;
  type IntrinsicElements = ReactModule.JSX.IntrinsicElements;
  type ElementChildrenAttribute = ReactModule.JSX.ElementChildrenAttribute & LLMx.JSX.ElementChildrenAttribute;
}

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

export const Fragment = ReactModule.Fragment;

export function useAI(children: LLMx.Node) {
  const [result, setResult] = ReactModule.useState([] as ReactModule.ReactNode);
  const [isDone, setIsDone] = ReactModule.useState(false);

  ReactModule.useEffect(() => {
    let shouldStop = false;
    async function stream() {
      setResult([]);
      setIsDone(false);

      // TODO: add a way for a render context to be aborted
      const renderResult = LLMx.createRenderContext().render(children, {
        stop: (e) => e.tag == React,
        map: (frame) => frame,
      });
      for await (const frame of renderResult) {
        if (shouldStop) {
          return;
        }

        setResult(frame.map((e) => (LLMx.isElement(e) ? e.props.children : e)) as ReactModule.ReactNode);
      }

      const final = await renderResult;
      if (shouldStop) {
        return;
      }
      setResult(final.map((e) => (LLMx.isElement(e) ? e.props.children : e)) as ReactModule.ReactNode);
      setIsDone(true);
    }

    stream();

    return () => {
      shouldStop = true;
    };
  }, [children]);

  return { result, isDone };
}

export function jsx({ children }: { children: LLMx.Node }, context?: any | LLMx.ComponentContext) {
  if (typeof context?.render === 'function') {
    // We're in AI.JSX already.
    return children;
  }

  const ai = useAI(children);
  return ReactModule.createElement(ReactModule.Fragment, null, ai.result) as any;
}

export function React({ children }: { children: ReactModule.ReactNode }, context?: any | LLMx.ComponentContext) {
  if (typeof context?.render === 'function') {
    // We're in AI.JSX; serialize the React.
    return LLMx.createElement(Serialize, null, children) as JSX.Element;
  }

  return children;
}
