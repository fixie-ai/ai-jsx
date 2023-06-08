import { Node, RenderContext } from '../index.js';

export async function* ErrorBoundary(
  props: { children: Node; fallback: Node | ((error: unknown) => Node) },
  { render }: RenderContext
) {
  try {
    // N.B. This means that partial rendering can't render "through" ErrorBoundary
    // components, i.e. that ErrorBoundary elements are atomic.
    return yield* render(props.children);
  } catch (ex) {
    return typeof props.fallback === 'function' ? props.fallback(ex) : props.fallback;
  }
}
