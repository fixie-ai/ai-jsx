/**
 * This module provides helper functions for debugging AI.JSX applications.
 *
 * @packageDocumentation
 */

import * as AI from '../index.js';
import { Element, ElementPredicate, Node, RenderContext } from '../index.js';
import { isMemoizedSymbol } from './memoize.js';

const maxStringLength = 1000;

/**
 * Used by {@link DebugTree} to render a tree of {@link Node}s.
 * @hidden
 */
export function debug(value: unknown, expandJSXChildren: boolean = true): string {
  const previouslyMemoizedIds = new Set();

  function debugRec(value: unknown, indent: string, context: 'code' | 'children' | 'props'): string {
    if (typeof value === 'string') {
      let jsonified = JSON.stringify(value);
      if (jsonified.length > maxStringLength) {
        jsonified = `${jsonified.slice(0, maxStringLength)}...`;
      }
      if (context === 'props' || context === 'code') {
        return jsonified;
      }
      return `{${jsonified}}`;
    }
    if (typeof value === 'number' || typeof value === 'bigint') {
      if (context === 'props' || context === 'children') {
        return `{${value.toString()}}`;
      }
      return value.toString();
    }
    if (typeof value === 'boolean' || typeof value === 'undefined') {
      return '';
    }
    if (value === null) {
      switch (context) {
        case 'code':
          return 'null';
        case 'children':
          return '{null}';
        case 'props':
          return '{null}';
      }
    } else if (AI.isElement(value)) {
      const tag = value.tag === AI.Fragment ? '' : value.tag.name;
      const childIndent = `${indent}  `;

      const isMemoized = isMemoizedSymbol in value.props;
      const memoizedIsPreviouslyRenderedToDebugOutput = previouslyMemoizedIds.has(value.props.id);

      if (isMemoized && !memoizedIsPreviouslyRenderedToDebugOutput) {
        previouslyMemoizedIds.add(value.props.id);
      }

      let children = '';
      if (expandJSXChildren && (!isMemoized || !memoizedIsPreviouslyRenderedToDebugOutput)) {
        children = debugRec(value.props.children, childIndent, 'children');
      }

      const results = [];
      if (value.props) {
        for (const key of Object.keys(value.props)) {
          const propValue = value.props[key];
          if (key === 'children' || propValue === undefined) {
            continue;
          } else {
            const valueStr = debugRec(propValue, indent, 'props');
            if (valueStr.length > maxStringLength) {
              results.push(` ${key}=<omitted large object>`);
            } else {
              results.push(` ${key}=${valueStr}`);
            }
          }
        }
      }

      const propsString = results.join('');

      const child =
        children !== ''
          ? `<${tag}${propsString}>\n${childIndent}${children}\n${indent}</${tag}>`
          : value.tag !== AI.Fragment
          ? `<${tag}${propsString} />`
          : '<></>';

      switch (context) {
        case 'code':
        case 'children':
          return child;
        case 'props':
          return `{${child}}`;
      }
    } else if (Array.isArray(value)) {
      const filter =
        context === 'children'
          ? (x: unknown) =>
              x !== undefined && x !== null && typeof x !== 'boolean' && !(Array.isArray(x) && x.length == 0)
          : () => true;
      const values = value.filter(filter).map((v) => debugRec(v, indent, context === 'children' ? 'children' : 'code'));
      switch (context) {
        case 'children':
          return values.join(`\n${indent}`);
        case 'props':
          return `{[${values.join(', ')}]}`;
        case 'code':
          return `[${values.join(', ')}]`;
      }
    } else if (typeof value === 'object') {
      if (context === 'props' || context === 'children') {
        return `{${JSON.stringify(value)}}`;
      }
      return JSON.stringify(value);
    } else if (typeof value === 'function') {
      const toRender = value.name === '' ? value.toString() : value.name;
      if (context === 'props' || context === 'children') {
        return `{${toRender}}`;
      }
      return toRender;
    } else if (typeof value === 'symbol') {
      if (context === 'props' || context === 'children') {
        return `{${value.toString()}}`;
      }
      return value.toString();
    }
    return '';
  }
  return debugRec(value, '', 'code');
}

/**
 * Render a tree of JSX elements as a string, yielding each step of the rendering process.
 *
 * Most devs will not need to use this directly, and should use {@link showInspector} instead.
 *
 * @example
 * ```tsx
 *    <DebugTree>
 *      <MyComponent />
 *    </DebugTree>
 *
 * ==>
 *  Frame 0: <DebugTree><MyComponent /></DebugTree>
 *  Frame 1: <DebugTree>the text my component resolved to</DebugTree>
 * ```
 */
export async function* DebugTree(props: { children: Node }, { render }: RenderContext) {
  let current = props.children;
  while (true) {
    yield debug(<DebugTree {...props}>{current}</DebugTree>);

    let elementToRender = null as Element<any> | null;
    const shouldStop: ElementPredicate = (element) => {
      if (elementToRender === null) {
        elementToRender = element;
      }
      return element !== elementToRender;
    };

    current = yield* render(current, {
      stop: shouldStop,
      map: (frame) => debug(<DebugTree {...props}>{frame}</DebugTree>),
    });

    if (elementToRender === null) {
      return current;
    }
  }
}
