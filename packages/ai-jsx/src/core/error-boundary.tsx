import * as LLMx from '../index.ts';
import { Node, RenderContext } from '../index.ts';

export async function* ErrorBoundary(
  props: { children: Node; fallback: Node | ((error: unknown) => Node) },
  { renderStream }: RenderContext
) {
  try {
    // N.B. This means that partial rendering can't render "through" ErrorBoundary
    // components, i.e. that ErrorBoundary elements are atomic.
    yield* renderStream(props.children);
  } catch (ex) {
    yield typeof props.fallback === 'function' ? props.fallback(ex) : props.fallback;
  }
}
