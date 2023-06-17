/** @jsx AI.createElement */
import * as AI from './index.js';
import React from 'react';

function reactComponentName(component: React.JSXElementConstructor<any> | string) {
  return typeof component === 'string' ? component : component.name;
}

/**
 * Serializes React components to a textual representation.
 */
export function Serialize({ children }: { children: React.ReactNode }): AI.Renderable {
  if (Array.isArray(children)) {
    return children.map((child) => <Serialize>{child}</Serialize>);
  }

  const child = children;
  if (React.isValidElement(child) && child.type !== AI.jsx) {
    // Serialize the React element and any children.
    const typeName = reactComponentName(child.type);
    // TODO: support prop serialization
    if (typeof child.props === 'object' && child.props && 'children' in child.props) {
      return [`<${typeName}>`, <Serialize>{child.props.children}</Serialize>, `</${typeName}`];
    }

    return `<${typeName}/>`;
  }

  return child as AI.Renderable;
}
