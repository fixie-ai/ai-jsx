import { Node, RenderContext } from '../index.js';

/**
 * Handle errors. If any child throws an error, the ErrorBoundary will show its `fallback` value instead.
 *
 * If the fallback itself throws an error, that error will be propagated. (Just like if your `catch` block throws an error.)
 *
 * @example
 * ```tsx
 *  <ErrorBoundary fallback="User data could not be fetched.">
 *    {fetchUserData()}
 *
 *  </ErrorBoundary>
 * ```
 * This is useful, because without it, any exception will make your entire request fail. It also gives you a chance to
 * instruct the model what to do in the case of failure.
 *
 * This is inspired by https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary.
 */
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
