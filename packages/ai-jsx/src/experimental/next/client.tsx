/** @jsxImportSource ai-jsx/react */
'use client';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

/**
 * Relates timestamps on the server to timestamps on the client.
 *
 * We use recursively nested <Suspense> components to stream content to the client.
 * But because <Suspense> "retry" updates are throttled to run at most every 300ms,
 * the streaming framerate is very low. We can't force each component to be rendered
 * sooner, but if a batch of components are rendered at the same time, we can delay
 * when the "later" chunks reveal their content according to the latency between them
 * on the server. This delays the entire stream by 300ms, but effectively increases
 * the framerate to make a smoother-looking stream.
 */
const ClockContext = createContext<[number, number]>([0, 0]);

/** @hidden */
export function Clock({ serverOrigin, children }: { serverOrigin: number; children: ReactNode }) {
  return <ClockContext.Provider value={[new Date().valueOf(), serverOrigin]}>{children}</ClockContext.Provider>;
}

/** @hidden */
export function DelayedReveal({ t, children }: { t: number; children: ReactNode }) {
  const [localOrigin, serverOrigin] = useContext(ClockContext);
  const [childrenToShow, setChildrenToShow] = useState(null as ReactNode);

  useEffect(() => {
    const now = new Date().valueOf();
    const localTime = localOrigin + (t - serverOrigin);

    if (now > localTime) {
      setChildrenToShow(children);
      return;
    }

    const timer = setTimeout(() => setChildrenToShow(children), localTime - now);
    return () => clearTimeout(timer);
  }, [localOrigin, serverOrigin, t]);

  return childrenToShow;
}
