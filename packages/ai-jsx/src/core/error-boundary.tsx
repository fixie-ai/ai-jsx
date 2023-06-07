import { LLMx } from './index.ts';

export async function* ErrorBoundary(
  props: { children: LLMx.Node; fallback: LLMx.Node | ((error: unknown) => LLMx.Node) },
  { renderStream }: LLMx.RenderContext
) {
  try {
    // N.B. This means that partial rendering can't render "through" ErrorBoundary
    // components, i.e. that ErrorBoundary elements are atomic.
    yield* renderStream(props.children);
  } catch (ex) {
    yield typeof props.fallback === 'function' ? props.fallback(ex) : props.fallback;
  }
}
