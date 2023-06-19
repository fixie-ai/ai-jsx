import * as ReactModule from 'react';
import * as AI from '../index.js';
import { Serialize } from './serialize.js';
export * from '../index.js';

/**
 * Creates an element that can be used either as a React or AI.jsx element. Used as the JSX factory.
 */
export function createElement(type: any, props: any, ...children: any[]) {
  const reactElement = ReactModule.createElement(type, props, ...children);
  const aiElement = AI.createElement(type === ReactModule.Fragment ? AI.Fragment : type, props, ...children);
  return AI.makeIndirectNode(reactElement, aiElement);
}

/**
 * The component to use for JSX fragments.
 */
export const Fragment = ReactModule.Fragment;

/**
 * A JSX component that allows React elements to be used in an AI.jsx component tree. If
 * the React components are forced to be rendered to a string within AI.jsx, they will be
 * serialized into a JSX string.
 */
export function React({ children }: { children: ReactModule.ReactNode }, context: AI.ComponentContext): AI.Renderable;
export function React({ children }: { children: ReactModule.ReactNode }): ReactModule.ReactNode;
export function React(
  { children }: { children: ReactModule.ReactNode },
  context?: AI.ComponentContext
): AI.Renderable | ReactModule.ReactNode {
  if (typeof context?.render === 'function') {
    // We're in AI.JSX; serialize the React.
    return createElement(Serialize, null, children);
  }

  return children;
}
