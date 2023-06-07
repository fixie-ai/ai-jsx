import { LLMx } from './index.ts';

export async function* ErrorBoundary(
  props: { children: LLMx.Node; fallback: LLMx.Node | ((error: unknown) => LLMx.Node) },
  { render }: LLMx.RenderContext
) {
  try {
    // N.B. This means that partial rendering can't render "through" ErrorBoundary
    // components, i.e. that ErrorBoundary elements are atomic.
    return yield* render(props.children);
  } catch (ex) {
    return typeof props.fallback === 'function' ? props.fallback(ex) : props.fallback;
  }
}
