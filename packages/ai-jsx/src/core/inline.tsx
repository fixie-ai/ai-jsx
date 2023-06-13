import { Node } from '../index.js';
import { memo } from './memoize';

type InlineFn = (prefix: Node) => Node;
type InlineChild = Node | InlineFn;
type InlineChildren = InlineChild | InlineChildren[];

/**
 * Use this to do a completion where you have access to the previously-rendered content.
 *
 * @see ../../../examples/inline-completion.tsx
 * ```
 *  const inlineCompletion = (prompt: Node) => (
 *   <Completion stop={['"']} temperature={1.0}>
 *     {prompt}
 *   </Completion>
 *  );
 *
 *  <Inline>
 *    The following is a character profile for an RPG game in JSON format:{'\n'}
 *    {'{'}
 *    {'\n  '}"class": "{inlineCompletion}",
 *    {'\n  '}"name": "{inlineCompletion}",
 *    {'\n  '}"mantra": "{inlineCompletion}"{'\n'}
 *    {'}'}
 *  </Inline>
 * ```
 *
 * In this example, we're filling in a JSON object. We start by wrapping the result in an `Inline` element. That gives us the ability to have children of the `Inline` which are functions that take the previously rendered content and return the next prompt.
 *
 * As this example is rendered, the `inlineCompletion` function would first be called with:
 * ```
 *    'The following is a character profile for an RPG game in JSON format: {"class": "'
 * ```
 * The function then uses a `Completion` component to prompt the model to produce a character name. The `stop` parameter is used to tell the model to stop generating characters when it reaches a double quote, which is good because we just want a single field in the JSON object. The `temperature` parameter is used to tell the model to be creative.
 *
 * Let's assume the model returns "Paladin" as the completion. In that case, the second `inlineCompletion` function invocation receives:
 * ```
 *    'The following is a character profile for an RPG game in JSON format: {"class": "Paladin", "name": "'
 * ```
 * In this way, we're able to iteratively build up a response where we control the overall structure but call out to the model at specified points.
 */
export function Inline(props: { children: InlineChildren }) {
  const flattened = [props.children].flat(Infinity as 1) as InlineChild[];
  return flattened.reduce((prefix: Node[], current) => {
    if (typeof current === 'function') {
      const memoized = memo(prefix);
      return [memoized, current(memoized)];
    }

    return prefix.concat(current);
  }, []);
}
