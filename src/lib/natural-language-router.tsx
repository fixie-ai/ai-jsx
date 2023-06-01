import { LLMx, log } from './index.ts';

export async function NaturalLanguageRouter(props: {children: LLMx.Node}) {
  const children = Array.isArray(props.children) ? props.children : [props.children];
  const whenOptions = [];

  for await (const stream of LLMx.partialRenderStream(children, el => el.tag === Route)) {
    const whenOptionsFromThisPart = stream
      .filter(LLMx.isElement)
      .filter(({tag}) => tag === Route)
      .map(({props}: {props: LLMx.PropsOfComponent<typeof Route>}) => props.when)
    
      whenOptions.push(...whenOptionsFromThisPart);
  }

  log.warn({whenOptions});  

  return children;
}

export function Route(props: {when: string, children: LLMx.Node, unmatched?: boolean}) {
  return props.children;
}