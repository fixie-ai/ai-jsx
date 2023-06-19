import * as ReactModule from 'react';
import * as AI from '../index.js';
import { Serialize } from './serialize.js';
export * from '../index.js';

export declare namespace JSX {
  // N.B. With this, all JSX elements will be assumed to be _both_ React and AI.jsx elements,
  // even though components generally only function as one or the other.
  type ElementType = ReactModule.JSX.ElementType | AI.JSX.ElementType;
  type Element = ReactModule.JSX.Element & AI.Node;
  type IntrinsicElements = ReactModule.JSX.IntrinsicElements;
  type ElementChildrenAttribute = ReactModule.JSX.ElementChildrenAttribute & AI.JSX.ElementChildrenAttribute;
}

/**
 * Creates an element that can be used either as a React or AI.jsx element. Used as the JSX factory.
 */
export function createElement(...args: Parameters<typeof ReactModule.createElement>) {
  const tag = args[0];
  const reactElement = ReactModule.createElement(...args);
  const aiElement = AI.createElement(
    tag === ReactModule.Fragment ? AI.Fragment : (tag as any),
    args[1] as any,
    ...args.slice(2)
  );
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
export function React({ children }: { children: ReactModule.ReactNode }, context?: any | AI.ComponentContext) {
  if (typeof context?.render === 'function') {
    // We're in AI.JSX; serialize the React.
    return AI.createElement(Serialize, null, children) as JSX.Element;
  }

  return children;
}
