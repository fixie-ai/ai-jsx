// import { ChatCompletion, SystemMessage, UserMessage } from '../core/completion.js';
// import * as AI from '../index.js';
// import { Node, RenderContext } from '../index.js';
// import { MergeExclusive } from 'type-fest';
// import _ from 'lodash';

// const noMatch = 'None of the routes match what the user said.';

// // This is exclusive, but a "select all that apply" could also be interesting.
// // What about prioritization? "Select top n"
// // This could also be used for dynamic context selection.
// // Need more thought around sub-routes.
// // I've observed that this is sensitive to the ordering of the routes – we probably want to either stamp that out or
// // make it explicit.

// /**
//  * Use a Large Language Model to steer the control flow of your application.
//  *
//  * You give this component two pieces: `children`, which contains {@link Route}s, and `query`, which is used to steer. The
//  * model will pick the {@link Route} that's the best match for the `query`.
//  *
//  * ```tsx
//  *    <NaturalLanguageRouter query="I'd like to cancel my account.">
//  *      <Route when='the user would like to cancel'>
//  *        <CancelRoute />
//  *      </Route>
//  *      <Route when='the user would like to upgrade'>
//  *        <Upgrade />
//  *      </Route>
//  *      <Route unmatched>
//  *       I'm sorry, but I can't help with that.
//  *      </Route>
//  *    </NaturalLanguageRouter>
//  * ```
//  *
//  * Typically, instead of hardcoding `query` as in the example above, you'd be receiving it from user input.
//  *
//  * The {@link Route}s do not need to be the direct descendents of the {@link NaturalLanguageRouter}:
//  *
//  * ```tsx
//  * <NaturalLanguageRouter query="I'd like to cancel my account.">
//  *    <><Route when='the user would like to cancel'></>
//  *    {() => <Route when='the user would like to upgrade'></>}
//  *    <SomeOtherComponentThatReturnsARoute />
//  * </NaturalLanguageRouter>
//  * ```
//  *
//  * However, you can't use nested Route components. If a {@link Route} contains another {@link Route},
//  * the inner {@link Route}'s `when` will not be considered. The inner {@link Route} will always show
//  * its children. For example:
//  *
//  * ```tsx
//  * <NaturalLanguageRouter>
//  *  <Route when='first option'>...</Route>
//  *  <Route when='second option'>
//  *    <Route when='third option'>This will always be shown</Route>
//  *  </Route>
//  * ```
//  *
//  * The router will find the first two routes, and ask the model to pick between "first option" and "second option".
//  * "third option" will not be presented as a choice, and its children will always be rendered.
//  *
//  * @see Route
//  */
// export async function* NaturalLanguageRouter(props: { children: Node; query: Node }, { render }: RenderContext) {
//   const renderedChildren = yield* render(props.children, {
//     stop: (el) => el.tag === Route,
//   });
//   const whenOptionsFromThisRenderedChildren = _.compact(
//     renderedChildren
//       .filter(AI.isElement)
//       .filter(({ tag }) => tag === Route)
//       .map(({ props }: { props: AI.PropsOfComponent<typeof Route> }) => props.when)
//   );
//   const anyChildrenUnmatched = renderedChildren.some((e) => AI.isElement(e) && e.tag === Route && e.props.unmatched);

//   let whenOptions = whenOptionsFromThisRenderedChildren;
//   if (anyChildrenUnmatched) {
//     whenOptions = [...whenOptions, noMatch];
//   }

//   // This will need to be tweaked when `i` is more than one token.
//   const logitBiases = Object.fromEntries(_.range(whenOptions.length + 1).map((i) => [i.toString(), 100]));

//   // Yield the surrounding content before blocking on the completion.
//   yield renderedChildren.filter((e) => !AI.isElement(e));

//   const choice = await render(
//     <ChatCompletion maxTokens={1} logitBias={logitBiases}>
//       <SystemMessage>
//         You are an expert text query matching agent. Your job is to match the user's query against one of the following
//         choices. Pick the choice that best describes the user's query. The available choices are:{'\n\n'}
//         {whenOptions.map((when, index) => (
//           <>
//             {index}: {when}{' '}
//           </>
//         ))}
//         {'\n\n'}
//         When the user gives you a query, respond with the number of the choice that best fits their query. Do not
//         respond with any other text.
//       </SystemMessage>
//       <UserMessage>{props.query}</UserMessage>
//     </ChatCompletion>
//   );

//   const choiceIndex = parseInt(choice);

//   // Keep only the routes that matched.
//   return renderedChildren.filter((e) => {
//     if (!AI.isElement(e)) {
//       return true;
//     }

//     const props = e.props as RouteProps;
//     return props.unmatched ? choiceIndex === whenOptions.length - 1 : props.when === whenOptions[choiceIndex];
//   });
// }

// /**
//  * Properties to pass to the {@link Route} component.
//  */
// export type RouteProps = { children: Node } & MergeExclusive<
//   {
//     /**
//      * The model will match this against the query. (Typically, this query will come from the user.)
//      */
//     when: string;
//   },
//   {
//     /**
//      * If set, this route will be picked when the model doesn't think the query matches any routes.
//      */
//     unmatched: true;
//   }
// >;

// /**
//  * Use with {@link NaturalLanguageRouter} to define a route.
//  *
//  * @see NaturalLanguageRouter
//  */
// export function Route(props: RouteProps) {
//   return props.children;
// }

// /**
//  * When we need to steer in an LLM-based app, a common approach is to throw everything at the model: "here's all the
//  * stuff you can do, here's what the user said, here's what you said before, etc, now give me a full plan of action."
//  *
//  * Whereas this approach is just focusing very narrowly on "pick a route", and only asking the model to emit a single
//  * token.
//  *
//  * I suspect the former approach will be more robust and easier to program as models get more accurate, but I think this
//  * approach will lead to more robustness today. I think with the former, it's still too likely that models will go off
//  * the rails.
//  */
