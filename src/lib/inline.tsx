import { LLMx } from '../lib';
import { memo } from './memoize';

export function Scope(props: { children: LLMx.Node }) {
  if (!Array.isArray(props.children)) {
    return props.children;
  }

  return props.children.reduce((collected: LLMx.Node[], current) => {
    if (LLMx.isElement(current) && current.tag === Inline) {
      const elementProps: LLMx.PropsOfComponent<typeof Inline> = current.props;
      const memoized = memo(collected);

      const Tag = elementProps.tag;
      const combined =
        elementProps.insert === 'before'
          ? [memoized, elementProps.children]
          : elementProps.insert === 'after'
          ? [elementProps.children, memoized]
          : memoized;

      const { tag, children, insert, ...copiedProps } = elementProps;
      return [memoized, <Tag {...copiedProps}>{combined}</Tag>];
    }
    return collected.concat(current);
  }, []);
}

export function Inline<T extends LLMx.Component<P & { children: LLMx.Node }>, P>(
  _props: {
    tag: T;
    children?: LLMx.Node;
    insert?: 'before' | 'after' | 'replace';
  } & P
): LLMx.Node {
  throw new Error('<Inline> elements must be placed directly within a <Scope> element and cannot be rendered.');
}
