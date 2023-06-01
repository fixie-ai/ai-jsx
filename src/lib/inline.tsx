import { LLMx } from '../lib/index.ts';
import { Renderable } from './llm.ts';
import { memo } from './memoize.ts';

export function Scope(props: { children: LLMx.Node }) {
  const children = Array.isArray(props.children) ? props.children : [props.children];
  return children.flat(Infinity as 1).reduce((collected: LLMx.Node[], current) => {
    if (LLMx.isElement(current) && current.tag === Inline) {
      const elementProps = current.props as LLMx.PropsOfComponent<typeof Inline>;
      const memoized = memo(collected);
      return [memoized, elementProps.children(memoized)];
    }
    return collected.concat(current);
  }, []);
}

export function Inline(_props: { children: (node: LLMx.Node) => LLMx.Node }): Renderable {
  throw new Error('<Inline> elements must be placed directly within a <Scope> element and should not be rendered.');
}
