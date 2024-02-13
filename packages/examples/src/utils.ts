import { createRenderContext, Node } from 'ai-jsx';

export function showJSX(jsx: Node) {
  return show(createRenderContext().render(jsx));
}

export async function show(iterable: AsyncIterable<string>) {
  for await (const item of iterable) {
    process.stdout.write(item);
  }
}
