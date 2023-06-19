const isJsxBoundarySymbol = Symbol('AI.jsx boundary');

/**
 * Indicates that the tag is an AI.jsx tag. Different flavors of React (e.g. React vs NextJS) can have different implementations.
 */
export function asJsxBoundary<T extends Function>(tag: T): T {
  return Object.assign(tag, { [isJsxBoundarySymbol]: true });
}

/**
 * Indicates whether tag is an <AI.jsx> tag.
 */
export function isJsxBoundary(tag: unknown) {
  return typeof tag === 'function' && isJsxBoundarySymbol in tag;
}
