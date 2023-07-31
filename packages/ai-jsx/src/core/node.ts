/**
 * This module defines the core node and element interfaces for AI.JSX.
 *
 * See: https://ai-jsx.com for more details.
 *
 * @packageDocumentation
 */

import { RenderContext, Renderable } from './render.js';
import { Logger } from './log.js';

/** A context that is used to render an AI.JSX component. */
export interface ComponentContext extends RenderContext {
  logger: Logger;
  isAppendOnlyRender: boolean;
}

/** Represents a single AI.JSX component. */
export type Component<P> = (props: P, context: ComponentContext) => Renderable;

/**
 * A Literal represents a literal value.
 */
export type Literal = string | number | null | undefined | boolean;

const attachedContextSymbol = Symbol('AI.attachedContext');
/**
 * An Element represents an instance of an AI.JSX component, with an associated tag, properties, and a render function.
 */
export interface Element<P> {
  /** The tag associated with this {@link Element}. */
  tag: Component<P>;
  /** The component properties. */
  props: P;
  /** A function that renders this {@link Element} to a {@link Renderable}. */
  render: (renderContext: RenderContext, logger: Logger, isAppendOnlyRender: boolean) => Renderable;
  /** The {@link RenderContext} associated with this {@link Element}. */
  [attachedContextSymbol]?: RenderContext;
}

const indirectNodeSymbol = Symbol('AI.indirectNode');
/**
 * An IndirectNode represents an opaque type with a reference to a {@link Node} that represents it.
 */
export interface IndirectNode {
  [indirectNodeSymbol]: Node;
}

/**
 * A Node represents an element of an AI.JSX component tree.
 */
export type Node = Element<any> | Literal | Node[] | IndirectNode;

/** @hidden */
export type ElementPredicate = (e: Element<any>) => boolean;

/** @hidden */
export type PropsOfComponent<T extends Component<any>> = T extends Component<infer P> ? P : never;

/** @hidden */
export function isIndirectNode(value: unknown): value is IndirectNode {
  return value !== null && typeof value === 'object' && indirectNodeSymbol in value;
}

/** @hidden */
export function getReferencedNode(value: IndirectNode): Node {
  return value[indirectNodeSymbol];
}

/** @hidden */
export function makeIndirectNode<T extends object>(value: T, node: Node): T & IndirectNode {
  return new Proxy(value, {
    has: (target, p) => p === indirectNodeSymbol || p in target,
    get: (target, p, receiver) => (p === indirectNodeSymbol ? node : Reflect.get(target, p, receiver)),
  }) as T & IndirectNode;
}

/** @hidden */
export function withContext(renderable: Renderable, context: RenderContext): Element<any> {
  function SwitchContext() {
    return renderable;
  }

  const elementWithContext = {
    ...(isElement(renderable) ? renderable : createElement(SwitchContext, null)),
    [attachedContextSymbol]: context,
  };

  Object.freeze(elementWithContext);
  return elementWithContext;
}

/** @hidden */
export function attachedContext(element: Element<any>): RenderContext | undefined {
  return element[attachedContextSymbol];
}

export function createElement<P extends { children: C }, C>(
  tag: Component<P>,
  props: Omit<P, 'children'> | null,
  ...children: [C]
): Element<P>;
/** @hidden */
export function createElement<P extends { children: C[] }, C>(
  tag: Component<P>,
  props: Omit<P, 'children'> | null,
  ...children: C[]
): Element<P>;
/** @hidden */
export function createElement<P extends { children: C | C[] }, C>(
  tag: Component<P>,
  props: Omit<P, 'children'> | null,
  ...children: C[]
): Element<P> {
  const propsToPass = {
    ...(props ?? {}),
    ...(children.length === 0 ? {} : { children: children.length === 1 ? children[0] : children }),
  } as P;

  const result = {
    tag,
    props: propsToPass,
    render: (ctx, logger, isAppendOnlyRender) => tag(propsToPass, { ...ctx, logger, isAppendOnlyRender }),
  } as Element<P>;
  Object.freeze(propsToPass);
  Object.freeze(result);
  return result;
}

/** @hidden */
export function isElement(value: unknown): value is Element<any> {
  return value !== null && typeof value === 'object' && 'tag' in value;
}

/** @hidden */
export function Fragment({ children }: { children: Node }): Renderable {
  return children;
}
