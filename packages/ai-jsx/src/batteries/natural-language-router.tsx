import { ChatCompletion, SystemMessage, UserMessage } from '../core/completion.jsx';
import * as LLMx from '../index.js';
import {Node, RenderContext} from '../index.js';
import { MergeExclusive } from 'type-fest';
import _ from 'lodash';

const noMatch = 'None of the routes match what the user said.';

// This is exclusive, but a "select all that apply" could also be interesting.
// What about prioritization? "Select top n"
// This could also be used for dynamic context selection.
// Need more thought around sub-routes.
// I've observed that this is sensitive to the ordering of the routes – we probably want to either stamp that out or
// make it explicit.
export async function* NaturalLanguageRouter(
  props: { children: Node; query: Node },
  { partialRenderStream, render }: RenderContext
) {
  let renderedChildren: Node[] = [];
  for await (const frame of partialRenderStream(props.children, (el) => el.tag === Route)) {
    renderedChildren = frame;
    // Exclude any routes until we pick one.
    yield frame.filter((e) => !LLMx.isElement(e));
  }
  const whenOptionsFromThisRenderedChildren = _.compact(
    renderedChildren
      .filter(LLMx.isElement)
      .filter(({ tag }) => tag === Route)
      .map(({ props }: { props: LLMx.PropsOfComponent<typeof Route> }) => props.when)
  );

  const whenOptions = [noMatch, ...whenOptionsFromThisRenderedChildren];

  // This will need to be tweaked when `i` is more than one token.
  const logitBiases = Object.fromEntries(_.range(whenOptions.length + 1).map((i) => [i.toString(), 100]));

  const choice = await render(
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

  const choiceIndex = parseInt(choice);

  // Keep only the routes that matched.
  yield renderedChildren.filter((e) => {
    if (!LLMx.isElement(e)) {
      return true;
    }

    const props = e.props as RouteProps;
    return props.unmatched ? choiceIndex === 0 : props.when === whenOptions[choiceIndex];
  });
}

type RouteProps = { children: Node } & MergeExclusive<{ when: string }, { unmatched: true }>;
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
