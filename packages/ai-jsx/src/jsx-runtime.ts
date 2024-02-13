import { Jsonifiable } from 'type-fest';
import {
  Node as AINode,
  Component as AIComponent,
  Element as AIElement,
  createElement,
  RenderNode,
} from './core/render3.js';
export { Fragment } from './core/symbols.js';

/** @hidden */

interface IntrinsicProps {
  children?: AINode;
  [key: string]: any;
}

interface ChatMessageProps extends IntrinsicProps {
  metadata?: Record<string, Jsonifiable>;
}

interface FunctionMessageProps extends ChatMessageProps {
  id?: string;
  name: RenderNode;
}

export declare namespace JSX {
  type ElementType = AIComponent<any> | string | symbol;
  interface Element extends AIElement<any> {}
  interface IntrinsicElements {
    system: ChatMessageProps;
    user: { name?: string } & ChatMessageProps;
    assistant: ChatMessageProps;
    functionCall: FunctionMessageProps;
    functionResponse: FunctionMessageProps;
    shrinkable: { importance: number; replacement?: AINode } & IntrinsicProps;
    [key: string]: IntrinsicProps;
  }
  interface ElementChildrenAttribute {
    children: {};
  }
}

/** @hidden */
export function jsx(type: any, config: any, maybeKey?: any) {
  const configWithKey = maybeKey !== undefined ? { ...config, key: maybeKey } : config;
  return createElement(type, configWithKey);
}
/** @hidden */
export const jsxDEV = jsx;

/** @hidden */
export const jsxs = jsx;
