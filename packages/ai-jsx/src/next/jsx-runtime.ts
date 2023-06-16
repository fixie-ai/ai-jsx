import * as ReactModule from 'react';
import * as LLMx from '../index.js';
export * from '../index.js';

export declare namespace JSX {
  type ElementType = ReactModule.JSX.ElementType | LLMx.JSX.ElementType;
  type Element = ReactModule.JSX.Element & LLMx.Node;
  type IntrinsicElements = ReactModule.JSX.IntrinsicElements;
  type ElementChildrenAttribute = ReactModule.JSX.ElementChildrenAttribute & LLMx.JSX.ElementChildrenAttribute;
}

export function jsx(...args: Parameters<typeof ReactModule.createElement>) {
  const tag = args[0];
  const reactElement = ReactModule.createElement(...args);
  const aiElement = LLMx.createElement(tag === ReactModule.Fragment ? LLMx.Fragment : (tag as any), args[1] as any);
  return LLMx.makeIndirectNode(reactElement, aiElement);
}

export const jsxs = jsx;

export const Fragment = ReactModule.Fragment;
