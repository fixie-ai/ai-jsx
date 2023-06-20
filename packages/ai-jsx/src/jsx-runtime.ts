import * as AI from './index.js';

/** @hidden */
export declare namespace JSX {
  type ElementType = AI.Component<any>;
  interface Element extends AI.Element<any> {}
  interface IntrinsicElements {}
  interface ElementChildrenAttribute {
    children: {};
  }
}

/** @hidden */
export function jsx(type: any, config: any, maybeKey?: any) {
  const configWithKey = maybeKey !== undefined ? { ...config, key: maybeKey } : config;
  const children = config && Array.isArray(config.children) ? config.children : [];
  return AI.createElement(type, configWithKey, ...children);
}
/** @hidden */
export const jsxDEV = jsx;

/** @hidden */
export const jsxs = jsx;

/** @hidden */
export const Fragment = AI.Fragment;
