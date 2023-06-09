import { ChatCompletion, SystemMessage, UserMessage } from '../core/completion';
import * as LLMx from '../index.js';
import { Node, RenderContext } from '../index.js';
import { MergeExclusive } from 'type-fest';
import _ from 'lodash';

const noMatch = 'None of the routes match what the user said.';

// This is exclusive, but a "select all that apply" could also be interesting.
// What about prioritization? "Select top n"
// This could also be used for dynamic context selection.
// Need more thought around sub-routes.
// I've observed that this is sensitive to the ordering of the routes – we probably want to either stamp that out or
// make it explicit.

/**
 * Ask the model to steer the control flow of your application.
 *
 * You give this component two pieces: `children`, which contains `Route`s, and `query`, which is used to steer. The
 * model will pick the `Route` that's the best match for the `query`.
 *
 * ```tsx
 *    <NaturalLanguageRouter query="I'd like to cancel my account.">
 *      <Route when='the user would like to cancel'>
 *        <CancelRoute />
 *      </Route>
 *      <Route when='the user would like to upgrade'>
 *        <Upgrade />
 *      </Route>
 *      <Route noMatch>
 *       I'm sorry, but I can't help with that.
 *      </Route>
 *    </NaturalLanguageRouter>
 * ```
 *
 * Typically, instead of hardcoding `query` as in the example above, you'd be receiving it from user input.
 *
 * The `Route`s do not need to be the direct descendents of the `NaturalLanguageRouter`:
 *
 * ```tsx
 * <NaturalLanguageRouter query="I'd like to cancel my account.">
 *    <><Route when='the user would like to cancel'></>
 *    {() => <Route when='the user would like to upgrade'></>}
 *    <SomeOtherComponentThatReturnsARoute />
 * </NaturalLanguageRouter>
 * ```
 *
 * However, you can't use nested Route components. If a <Route> contains another <Route>, the inner <Route>'s `when` will not be considered. The inner Route will always show its children. For example:
 *
 * ```tsx
 * <NaturalLanguageRouter>
 *  <Route when='first option'>...</Route>
 *  <Route when='second option'>
 *    <Route when='third option'>This will always be shown</Route>
 *  </Route>
 * ```
 *
 * The router will find the first two routes, and ask the model to pick between "first option" and "second option".
 * "third option" will not be presented as a choice, and its children will always be rendered.
 *
 * @see Route
 */
export async function* NaturalLanguageRouter(props: { children: Node; query: Node }, { render }: RenderContext) {
  const renderedChildren = yield* render(props.children, {
    stop: (el) => el.tag === Route,
  });
  const whenOptionsFromThisRenderedChildren = _.compact(
    renderedChildren
      .filter(LLMx.isElement)
      .filter(({ tag }) => tag === Route)
      .map(({ props }: { props: LLMx.PropsOfComponent<typeof Route> }) => props.when)
  );

  const whenOptions = [noMatch, ...whenOptionsFromThisRenderedChildren];

  // This will need to be tweaked when `i` is more than one token.
  const logitBiases = Object.fromEntries(_.range(whenOptions.length + 1).map((i) => [i.toString(), 100]));

  // Yield the surrounding content before blocking on the completion.
  yield renderedChildren.filter((e) => !LLMx.isElement(e));

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
  return renderedChildren.filter((e) => {
    if (!LLMx.isElement(e)) {
      return true;
    }

    const props = e.props as RouteProps;
    return props.unmatched ? choiceIndex === 0 : props.when === whenOptions[choiceIndex];
  });
}

type RouteProps = { children: Node } & MergeExclusive<
  {
    /**
     * The model will match this against the query. (Typically, this query will come from the user.)
     */
    when: string;
  },
  {
    /**
     * If set, this route will be picked when the model doesn't think the query matches any routes.
     */
    unmatched: true;
  }
>;

/**
 * Use with `NaturalLanguageRouter` to define a route.
 *
 * @see NaturalLanguageRouter
 */
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
