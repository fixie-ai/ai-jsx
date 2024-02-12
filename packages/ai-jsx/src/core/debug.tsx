// /**
//  * This module provides helper functions for debugging AI.JSX applications.
//  *
//  * @packageDocumentation
//  */

// import * as AI from '../index.js';
// import { Element, ElementPredicate, Node, RenderContext } from '../index.js';
// import { memoizedIdSymbol } from './memoize.js';

// const maxStringLength = 1000;

// const debugRepresentationSymbol = Symbol('AI.JSX debug representation');

// /**
//  * Creates props that associate a debug representation with an element.
//  *
//  * Usage example:
//  *
//  * ```tsx
//  * <InvisibleComponent {...debugRepresentation((e) => e.props.children)}>
//  *   <Foo>1</Foo>
//  * </InvisibleComponent>
//  * ```
//  *
//  * When the `<InvisibleComponent>` would be displayed in a {@link DebugTree}, it will be replaced
//  * with its children.
//  */
// export function debugRepresentation(fn: (element: Element<any>) => unknown) {
//   return {
//     [debugRepresentationSymbol]: fn,
//   };
// }

// /**
//  * Used by {@link DebugTree} to render a tree of {@link Node}s.
//  * @hidden
//  */
// export function debug(value: unknown, expandJSXChildren: boolean = true): string {
//   const previouslyMemoizedElements = new Set<Element<any>>();

//   function debugRec(value: unknown, indent: string, context: 'code' | 'children' | 'props'): string {
//     if (AI.isIndirectNode(value)) {
//       return debugRec(AI.getReferencedNode(value), indent, context);
//     }

//     if (typeof value === 'string') {
//       let jsonified = JSON.stringify(value);
//       if (jsonified.length > maxStringLength) {
//         jsonified = `${jsonified.slice(0, maxStringLength)}...`;
//       }
//       if (context === 'props' || context === 'code') {
//         return jsonified;
//       }
//       return `{${jsonified}}`;
//     }
//     if (typeof value === 'number' || typeof value === 'bigint') {
//       if (context === 'props' || context === 'children') {
//         return `{${value.toString()}}`;
//       }
//       return value.toString();
//     }
//     if (typeof value === 'boolean' || typeof value === 'undefined') {
//       return '';
//     }
//     if (value === null) {
//       switch (context) {
//         case 'code':
//           return 'null';
//         case 'children':
//           return '{null}';
//         case 'props':
//           return '{null}';
//       }
//     } else if (AI.isElement(value)) {
//       if (debugRepresentationSymbol in value.props) {
//         return debugRec(value.props[debugRepresentationSymbol](value), indent, context);
//       }

//       const childIndent = `${indent}  `;

//       const memoizedId = memoizedIdSymbol in value.props && (value.props[memoizedIdSymbol] as number);
//       const expandChildrenForThisElement = expandJSXChildren && !previouslyMemoizedElements.has(value);
//       if (memoizedId) {
//         previouslyMemoizedElements.add(value);
//       }

//       let children = '';
//       if (expandChildrenForThisElement) {
//         children = debugRec(value.props.children, childIndent, 'children');
//       }

//       const results = [];

//       if (memoizedId) {
//         results.push(` @memoizedId=${memoizedId}`);
//       }

//       if (value.props) {
//         for (const key of Object.keys(value.props)) {
//           const propValue = value.props[key];
//           if (key === 'children' || propValue === undefined) {
//             continue;
//           } else {
//             const valueStr = debugRec(propValue, indent, 'props');
//             if (valueStr.length > maxStringLength) {
//               results.push(` ${key}=<omitted large object>`);
//             } else {
//               results.push(` ${key}=${valueStr}`);
//             }
//           }
//         }
//       }

//       const propsString = results.join('');

//       const tag =
//         value.tag === AI.Fragment && results.length == 0
//           ? ''
//           : typeof value.tag === 'string'
//           ? value.tag
//           : value.tag.name;
//       const child =
//         children !== ''
//           ? `<${tag}${propsString}>\n${childIndent}${children}\n${indent}</${tag}>`
//           : value.tag !== AI.Fragment
//           ? `<${tag}${propsString} />`
//           : '<></>';

//       switch (context) {
//         case 'code':
//         case 'children':
//           return child;
//         case 'props':
//           return `{${child}}`;
//       }
//     } else if (Array.isArray(value)) {
//       const filter =
//         context === 'children'
//           ? (x: unknown) =>
//               x !== undefined && x !== null && typeof x !== 'boolean' && !(Array.isArray(x) && x.length == 0)
//           : () => true;
//       const values = value.filter(filter).map((v) => debugRec(v, indent, context === 'children' ? 'children' : 'code'));
//       switch (context) {
//         case 'children':
//           return values.join(`\n${indent}`);
//         case 'props':
//           return `{[${values.join(', ')}]}`;
//         case 'code':
//           return `[${values.join(', ')}]`;
//       }
//     } else if (typeof value === 'object') {
//       let stringified;
//       try {
//         stringified = JSON.stringify(value);
//       } catch {
//         stringified = '{/* ... */}';
//       }
//       if (context === 'props' || context === 'children') {
//         return `{${stringified}}`;
//       }
//       return stringified;
//     } else if (typeof value === 'function') {
//       const toRender = value.name === '' ? value.toString() : value.name;
//       if (context === 'props' || context === 'children') {
//         return `{${toRender}}`;
//       }
//       return toRender;
//     } else if (typeof value === 'symbol') {
//       if (context === 'props' || context === 'children') {
//         return `{${value.toString()}}`;
//       }
//       return value.toString();
//     }
//     return '';
//   }
//   return debugRec(value, '', 'code');
// }

// /**
//  * Render a tree of JSX elements as a string, yielding each step of the rendering process.
//  *
//  * Most devs will not need to use this directly, and should use {@link showInspector} instead.
//  *
//  * @example
//  * ```tsx
//  *    <DebugTree>
//  *      <MyComponent />
//  *    </DebugTree>
//  *
//  * ==>
//  *  Frame 0: <DebugTree><MyComponent /></DebugTree>
//  *  Frame 1: <DebugTree>the text my component resolved to</DebugTree>
//  * ```
//  */
// export async function* DebugTree(props: { children: Node }, { render }: RenderContext) {
//   let current = props.children;
//   while (true) {
//     yield debug(<DebugTree {...props}>{current}</DebugTree>);

//     let elementToRender = null as Element<any> | null;
//     const shouldStop: ElementPredicate = (element) => {
//       if (elementToRender === null) {
//         elementToRender = element;
//       }
//       return element !== elementToRender;
//     };

//     current = yield* render(current, {
//       stop: shouldStop,
//       map: (frame) => debug(<DebugTree {...props}>{frame}</DebugTree>),
//     });

//     if (elementToRender === null) {
//       return current;
//     }
//   }
// }
