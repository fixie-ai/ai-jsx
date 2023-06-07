import { Node } from '../index.js';
import { memo } from './memoize.jsx';

export function Inline(props: { children: (Node | ((prefix: Node) => Node))[] }) {
  return props.children.flat(Infinity as 1).reduce((prefix: Node[], current) => {
    if (typeof current === 'function') {
      const memoized = memo(prefix);
      return [memoized, current(memoized)];
    }

    return prefix.concat(current);
  }, []);
}
