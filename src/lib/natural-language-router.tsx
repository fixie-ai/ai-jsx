import { ChatCompletion, SystemMessage, UserMessage } from './completion-components.tsx';
import { LLMx, log } from './index.ts';
import { MergeExclusive } from 'type-fest';
import { memo } from './memoize.tsx';
import _ from 'lodash';

export async function NaturalLanguageRouter(props: { children: LLMx.Node; query: string }) {
  // Is memo righteous?
  const children = memo(Array.isArray(props.children) ? props.children : [props.children]);
  const whenOptions = ['None of the routes match what the user said.'];

  for await (const stream of LLMx.partialRenderStream(children, (el) => el.tag === Route)) {
    const whenOptionsFromThisPart = _.compact(
      stream
        .filter(LLMx.isElement)
        .filter(({ tag }) => tag === Route)
        .map(({ props }: { props: LLMx.PropsOfComponent<typeof Route> }) => props.when)
    );

    whenOptions.push(...whenOptionsFromThisPart);
  }

  const logitBiases = Object.fromEntries(_.range(whenOptions.length + 1).map((i) => [i.toString(), 100]));

  const choice = await LLMx.render(
    <ChatCompletion maxTokens={1} logitBias={logitBiases}>
      <SystemMessage>
        You are an expert routing agent.
        {whenOptions.map((when, index) => (
          <>
            {index}: {when}
          </>
        ))}
        When the user gives you a query, respond with the number of the route that best fits their query. Do not respond
        with any other text.
      </SystemMessage>
      <UserMessage>{props.query}</UserMessage>
    </ChatCompletion>
  );

  return choice;
}

type RouteProps = { children: LLMx.Node } & MergeExclusive<{ when: string }, { unmatched: true }>;
export function Route(props: RouteProps) {
  return props.children;
}
