import * as ReactModule from 'react';
import * as AI from '../index.js';
import { Serialize } from './serialize.js';
import { isJsxBoundary } from './jsx-boundary.js';
import { ElementSerializer } from '../stream/index.js';
import { ComponentMap } from './map.js';
import { AIJSXError, ErrorCode } from '../core/errors.js';
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

/**
 * Creates a seralizer function serializes React components.
 */
export function createElementSerializer(map: ComponentMap<any>): ElementSerializer {
  return (element: AI.Element<any>) => {
    if (isJsxBoundary(element.tag)) {
      throw new AIJSXError(
        'Serializing AI.JSX components within React components is not yet supported.',
        ErrorCode.NestedAIUIStreamsAreNotSupported,
        'internal'
      );
    }

    return {
      $$type: 'element',
      $$component:
        typeof element.tag === 'string'
          ? element.tag
          : element.tag === React || element.tag === AI.Fragment || !map.componentToId.has(element.tag)
          ? null
          : { id: map.componentToId.get(element.tag) },
      props: element.props,
    };
  };
}
