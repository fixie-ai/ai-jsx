import { ChatCompletion, SystemMessage, UserMessage } from './completion-components.js';
import { LLMx } from './index.js';
import { MergeExclusive } from 'type-fest';
import { memo } from './memoize.js';
import _ from 'lodash';

const noMatch = 'None of the routes match what the user said.';

async function ChooseRoute(
  props: { choice: LLMx.Node; whenOptions: string[]; children: LLMx.Node },
  { render, partialRender }: LLMx.RenderContext
) {
  const choiceResult = await render(props.choice);
  const selectedWhenOption = props.whenOptions[parseInt(choiceResult)];
  // TODO: validation, even though the logit_bias should make this impossible (?).

  // TODO: I don't think this suports as much nesting as we want.
  const children = await partialRender(props.children, (el) => el.tag === Route);
  const selectedChildren = children
    .filter(LLMx.isElement)
    .filter(({ tag }) => tag === Route)
    .filter(({ props }: { props: LLMx.PropsOfComponent<typeof Route> }) =>
      selectedWhenOption == noMatch ? props.unmatched : props.when === selectedWhenOption
    );

  return selectedChildren;
}

// This is exclusive, but a "select all that apply" could also be interesting.
// What about prioritization? "Select top n"
// This could also be used for dynamic context selection.
// Need more thought around sub-routes.
// I've observed that this is sensitive to the ordering of the routes – we probably want to either stamp that out or
// make it explicit.
export async function NaturalLanguageRouter(
  props: { children: LLMx.Node; query: string },
  { partialRender }: LLMx.RenderContext
) {
  const children = memo(Array.isArray(props.children) ? props.children : [props.children]);

  const renderedChildren = await partialRender(children, (el) => el.tag === Route);
  const whenOptionsFromThisRenderedChildren = _.compact(
    renderedChildren
      .filter(LLMx.isElement)
      .filter(({ tag }) => tag === Route)
      .map(({ props }: { props: LLMx.PropsOfComponent<typeof Route> }) => props.when)
  );

  const whenOptions = [noMatch, ...whenOptionsFromThisRenderedChildren];

  // This will need to be tweaked when `i` is more than one token.
  const logitBiases = Object.fromEntries(_.range(whenOptions.length + 1).map((i) => [i.toString(), 100]));

  const choice = (
    <ChatCompletion maxTokens={1} logitBias={logitBiases}>
      <SystemMessage>
        You are an expert routing agent.
        {whenOptions.map((when, index) => (
          <>
            {index}: {when}{' '}
          </>
        ))}
        When the user gives you a query, respond with the number of the route that best fits their query. Do not respond
        with any other text.
      </SystemMessage>
      <UserMessage>{props.query}</UserMessage>
    </ChatCompletion>
  );

  return (
    <ChooseRoute choice={choice} whenOptions={whenOptions}>
      {children}
    </ChooseRoute>
  );
}

type RouteProps = { children: LLMx.Node } & MergeExclusive<{ when: string }, { unmatched: true }>;
export function Route(props: RouteProps) {
  return props.children;
}

/**
 * When we need to steer in an LLM-based app, a common approach is to throw everything at the model: "here's all the
 * stuff you can do, here's what the user said, here's what you said before, etc, now give me a full plan of action."
 *
 * Whereas this approach is just focusing very narrowly on "pick a route", and only asking the model to emit a single
 * token.
 *
 * I suspect the former approach will be more robust and easier to program as models get more accurate, but I think this
 * approach will lead to more robustness today. I think with the former, it's still too likely that models will go off
 * the rails.
 */
