import { Node } from '../index.ts';
import { memo } from './memoize.tsx';

export function Inline(props: { children: (Node | ((prefix: Node) => Node))[] }) {
  return props.children.flat(Infinity as 1).reduce((prefix: Node[], current) => {
    if (typeof current === 'function') {
      const memoized = memo(prefix);
      return [memoized, current(memoized)];
    }

    return prefix.concat(current);
  }, []);
}
