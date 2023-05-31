import { LLMx } from '../lib';

export async function* DebugTree(props: { children: LLMx.Node }) {
  let current = props.children;
  while (true) {
    yield LLMx.debug(<DebugTree {...props}>{current}</DebugTree>);

    let elementToRender: LLMx.Element<any> | null = null;

    function shouldStop(element: LLMx.Element<any>): boolean {
      if (elementToRender === null) {
        elementToRender = element;
        return false;
      } else {
        return true;
      }
    }

    current = await LLMx.partialRender(current, shouldStop);

    if (elementToRender === null) {
      break;
    }
  }

  yield current;
}
