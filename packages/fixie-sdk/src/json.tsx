import * as AI from 'ai-jsx';

async function* JsonString({ children }: { children: AI.Node }, { render }: AI.ComponentContext) {
  const final = yield* render(children, { map: (frame) => JSON.stringify(frame) });
  return JSON.stringify(final);
}

export function Json({ children }: { children: unknown }): AI.Node {
  if (typeof children !== 'object') {
    return JSON.stringify(children);
  }

  if (Array.isArray(children)) {
    const mapped = children.map((value, i, array) => (
      <>
        <Json>{value}</Json>
        {i < array.length - 1 ? ',' : ''}
      </>
    ));

    return <>[{mapped}]</>;
  }

  if (AI.isElement(children)) {
    return <JsonString>{children}</JsonString>;
  }

  const keys = Object.getOwnPropertyNames(children);
  const mapped = keys.map((value, i, array) => (
    <>
      {JSON.stringify(value)}: <Json>{(children as any)[value]}</Json>
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
