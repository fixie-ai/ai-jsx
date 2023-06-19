import * as React from 'react';
import * as LLMx from '../index.js';
export * from '../index.js';

export declare namespace JSX {
  type ElementType = React.JSX.ElementType | LLMx.JSX.ElementType;
  type Element = React.JSX.Element & LLMx.Node;
  type IntrinsicElements = React.JSX.IntrinsicElements;
  type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute & LLMx.JSX.ElementChildrenAttribute;
}

export function jsx(type: any, config: any, maybeKey?: any) {
  const reactElement = React.createElement(type, { ...config, ...(maybeKey === undefined ? {} : { key: maybeKey }) });
  const aiElement = LLMx.createElement(type === React.Fragment ? LLMx.Fragment : type, config);
  return LLMx.makeIndirectNode(reactElement, aiElement);
}

export const jsxs = jsx;

export const Fragment = React.Fragment;
