import * as AI from 'ai-jsx';

async function* JsonString({ children }: { children: AI.Node }, { render }: AI.ComponentContext) {
  const final = yield* render(children, { map: (frame) => JSON.stringify(frame) });
  return JSON.stringify(final);
}

export function Json({ children }: { children: unknown }): AI.Node {
  if (typeof children !== 'object' || children === null) {
    return JSON.stringify(children);
  }

  if (Array.isArray(children)) {
    const mapped = children.map((value, i, array) => (
      <>
        {/* In arrays, undefined gets serialized as null. */}
        <Json>{value ?? null}</Json>
        {i < array.length - 1 ? ',' : ''}
      </>
    ));

    return <>[{mapped}]</>;
  }

  if (AI.isElement(children)) {
    return <JsonString>{children}</JsonString>;
  }

  // In objects, undefined fields get omitted.
  const mapped = Object.entries(children as Record<string, unknown>)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value], i, array) => (
      <>
        {JSON.stringify(key)}: <Json>{value}</Json>
        {i < array.length - 1 ? ',' : ''}
      </>
    ));

  return (
    <>
      {'{'}
      {mapped}
      {'}'}
    </>
  );
}
