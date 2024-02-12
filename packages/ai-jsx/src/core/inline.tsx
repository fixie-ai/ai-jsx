import { Component, ComponentContext, Node } from '../index.js';

const isInlineCompletion = Symbol('IsInlineCompletion');
interface InlineCompletion {
  [isInlineCompletion]: true;
  tag: Component<{ children: Node }>;
}
type InlineChild = Node | InlineCompletion;
type InlineChildren = InlineChild | InlineChildren[];

/**
 * The Inline component renders each of its children in sequence, optionally passing the previously rendered content to the next child.
 *
 * @example
 * ```tsx
 *  function JsonString(props: { children: Node }) {
 *    return <Completion stop={['"']}>{props.children}</Completion>;
 *  }
 *
 *  <Inline>
 *    The following is a character profile for an RPG game in JSON format:{'\n'}
 *    {'{'}
 *    {'\n  '}"class": "{__(JsonString)}",
 *    {'\n  '}"name": "{__(JsonString)}",
 *    {'\n  '}"mantra": "{__(JsonString)}"{'\n'}
 *    {'}'}
 *  </Inline>
 * ```
 *
 * In this example, we're filling in a JSON object. We start by wrapping the result in an `Inline` element. That gives us the ability to have children of the `Inline` which are functions that take the previously rendered content and return the next prompt.
 *
 * As this example is rendered, the `JsonString` component would first be called with:
 * ```
 *    'The following is a character profile for an RPG game in JSON format: {"class": "'
 * ```
 * The function then uses a `Completion` component to prompt the model to produce a character name. The `stop` parameter is used to tell the model to stop generating characters when it reaches a double quote, which is good because we just want a single field in the JSON object.
 *
 * Let's assume the model returns "Paladin" as the completion. In that case, the second `JsonString` function invocation receives:
 * ```
 *    'The following is a character profile for an RPG game in JSON format: {"class": "Paladin", "name": "'
 * ```
 * In this way, we're able to iteratively build up a response where we control the overall structure but call out to the model at specified points.
 */
export function Inline(props: { children: InlineChildren }, { render }: ComponentContext) {
  const flattened = [props.children].flat(Infinity as 1) as InlineChild[];
  return flattened.reduce((prefix: Node[], current) => {
    if (typeof current === 'object' && current && isInlineCompletion in current) {
      const rendered = render(prefix);
      return [rendered, <current.tag>{rendered}</current.tag>];
    }

    return prefix.concat(current);
  }, []);
}

/**
 * Creates a "blank" that the Inline component will fill in.
 * @see Inline
 */
export function __(tag: Component<{ children: Node }>): InlineCompletion {
  return { [isInlineCompletion]: true, tag };
}
