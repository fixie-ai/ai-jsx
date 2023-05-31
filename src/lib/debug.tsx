import { LLMx } from '../lib';

export async function* DebugTree(props: { children: LLMx.Node }) {
  let current = props.children;
  while (true) {
    yield LLMx.debug(<DebugTree {...props}>{current}</DebugTree>);

    let elementToRender: LLMx.Element<any> | null = null;
    const shouldStop = (element: LLMx.Element<any>): boolean => {
      if (elementToRender === null) {
        elementToRender = element;
      }
      return element !== elementToRender;
    };

    // Use a closure to prevent the type from being incorrectly narrowed.
    // https://github.com/microsoft/TypeScript/issues/9998#issuecomment-235963457
    const didRenderSomething = () => elementToRender !== null;

    current = await LLMx.partialRender(current, shouldStop);
    if (!didRenderSomething()) {
      break;
    }
  }

  yield current;
}
