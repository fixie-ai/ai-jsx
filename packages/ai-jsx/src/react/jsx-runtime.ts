import * as React from 'react';
import * as AI from '../index.js';
import { JSX as AIJSX } from '../jsx-runtime.js';

export declare namespace JSX {
  type ElementType = React.JSX.ElementType | AIJSX.ElementType;
  type Element = React.JSX.Element & AIJSX.Element;
  type IntrinsicElements = React.JSX.IntrinsicElements & AIJSX.IntrinsicElements;
  type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute & AIJSX.ElementChildrenAttribute;
}

export function jsx(type: any, config: any, maybeKey?: any) {
  const configWithKey = maybeKey !== undefined ? { ...config, key: maybeKey } : config;
  const children = config && Array.isArray(config.children) ? config.children : [];

  const reactElement = React.createElement(type, configWithKey, ...children);
  const aiElement = AI.createElement(type === React.Fragment ? AI.Fragment : type, configWithKey, ...children);
  return AI.makeIndirectNode(reactElement, aiElement);
}
export const jsxDEV = jsx;

export const jsxs = jsx;

export const Fragment = React.Fragment;
