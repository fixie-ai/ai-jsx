const isJsxBoundarySymbol = Symbol('AI.jsx boundary');

/**
 * Indicates that the tag is an AI.jsx tag. (Different flavors of React have different implementations.)
 */
export function markAsJsxBoundary(tag: Function) {
  return ((tag as any)[isJsxBoundarySymbol] = true);
}

/**
 * Indicates whether tag is an <AI.jsx> tag.
 */
export function isJsxBoundary(tag: unknown) {
  return typeof tag === 'function' && isJsxBoundarySymbol in tag;
}
