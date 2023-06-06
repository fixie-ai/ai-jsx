import { LLMx } from '../lib/index.ts';
import { memo } from './memoize.tsx';

export function Inline(props: { children: (LLMx.Node | ((prefix: LLMx.Node) => LLMx.Node))[] }) {
  return props.children.flat(Infinity as 1).reduce((prefix: LLMx.Node[], current) => {
    if (typeof current === 'function') {
      const memoized = memo(prefix);
      return [memoized, current(memoized)];
    }

    return prefix.concat(current);
  }, []);
}
