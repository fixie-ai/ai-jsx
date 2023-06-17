import * as AI from 'ai-jsx/react';
import * as React from 'react';
import { useRef, useEffect, useState } from 'react';

export function useAI(children: AI.Node, when: boolean = true) {
  const isInProgressRef = useRef(false);
  const mostRecentlyRenderedChildren = useRef(children);
  // If `children` changes, but a previous call is still in progress, will we properly start a new one?
  const [result, setResult] = useState([] as AI.Node[]);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (isInProgressRef.current || !when) {
      return;
    }
    setResult([]);
    setIsDone(false);
    AI.createRenderContext()
      .render(children, {
        // Streaming won't work. We see this error in the console:
        // xhr.js:174 The provided value 'stream' is not a valid enum value of type XMLHttpRequestResponseType.
        map: (frame) => setResult(frame),
        stop: (e) => e.tag.name.startsWith('Recipe'),
      })
      .then((frame) => {
        isInProgressRef.current = false;
        mostRecentlyRenderedChildren.current = children;
        setResult(frame);
        setIsDone(true);
      });
  }, [children, when]);

  // It seems like there should be a better way to do this.
  const isActuallyDone = mostRecentlyRenderedChildren.current === children && isDone;

  return { result, isDone: isActuallyDone };
}

// function Loading() {
//   return <img src="/loading.gif" width={100} height={100} alt="loading" />;
// }

function AIStream({ children }: { children: AI.Node }) {
  return <>{useAI(children).result}</>;
}

/**
 * A conversion layer between React and AI.JSX components.
 *
 * ```
 *    <ReactComponent>
 *      <AI>
 *        <ChatCompletion>...</ChatCompletion>
 * ```
 *
 * By default, it'll stream results character-by-character to the frontend.
 */
export function AIComponent({ children }: { children: AI.Node }) {
  return <AIStream>{children}</AIStream>;
}
