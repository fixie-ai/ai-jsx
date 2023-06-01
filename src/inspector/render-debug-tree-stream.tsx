import { LLMx } from '../lib/index.ts';
import { DebugTree } from '../lib/debug.tsx';

export default function renderDebugTreeStream(memoized: LLMx.Node) {
  return LLMx.renderStream(<DebugTree>{memoized}</DebugTree>);
}
