import { LLMx, log } from './index.ts';

export function NaturalLanguageRouter(props: {children: LLMx.Node}) {
  const children = Array.isArray(props.children) ? props.children : [props.children];
  const whenOptions = children
    .flat(Infinity as 1)
    .filter(LLMx.isElement)
    .filter(({tag}) => tag === Route)
    .map(({props}: {props: LLMx.PropsOfComponent<typeof Route>}) => props.when)

  // This will only work if the Routes are ~immediate children of the NaturalLanguageRouter.
  // We may want to validate / warn / be robust to that / etc.
  
  log.warn({whenOptions});  

  return children;
}

export function Route(props: {when: string, children: LLMx.Node, unmatched?: boolean}) {
  return props.children;
}