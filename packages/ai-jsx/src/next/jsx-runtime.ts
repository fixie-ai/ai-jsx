import * as React from 'react';
import * as AI from '../index.js';
export * from '../index.js';

export declare namespace JSX {
  type ElementType = React.JSX.ElementType | AI.JSX.ElementType;
  type Element = React.JSX.Element & AI.Node;
  type IntrinsicElements = React.JSX.IntrinsicElements;
  type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute & AI.JSX.ElementChildrenAttribute;
}

export function jsx(type: any, config: any, maybeKey?: any) {
  const reactElement = React.createElement(type, { ...config, ...(maybeKey === undefined ? {} : { key: maybeKey }) });
  const aiElement = AI.createElement(type === React.Fragment ? AI.Fragment : type, config);
  return AI.makeIndirectNode(reactElement, aiElement);
}

export const jsxs = jsx;

export const Fragment = React.Fragment;
