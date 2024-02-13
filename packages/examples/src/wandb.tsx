// /**
//  * Weights and Biases integration for AI.JSX.
//  *
//  * This example demonstrates how to use the Weights and Biases integration for AI.JSX.
//  *
//  * To run this example, make sure that you've set the `WANDB_API_KEY` environment variable.
//  *
//  * See: https://docs.wandb.ai/ref/js/ for more info.
//  *
//  * Example run:
//  * ```text
//  *     $ yarn workspace examples demo:wandb
//  *     The following is a character profile for an RPG game in JSON format:
//  *     {
//  *      "class": "Warrior",
//  *      "name": "Rajo",
//  *      "mantra": "Take no prisoners!"
//  *     }
//  *     View run at https://wandb.ai/.../runs/...
//  * ```
//  *
//  * @packageDocumentation
//  */
// import * as AI from 'ai-jsx';
// import { Completion } from 'ai-jsx/core/completion';
// import { Inline } from 'ai-jsx/core/inline';
// import { wandb } from '@wandb/sdk';

// import { WeightsAndBiasesTracer } from 'ai-jsx/batteries/logging-integrations';

// function CharacterGenerator() {
//   const inlineCompletion = (prompt: AI.Node) => (
//     <Completion stop={['"']} temperature={1.0}>
//       {prompt}
//     </Completion>
//   );

//   return (
//     <Inline>
//       The following is a character profile for an RPG game in JSON format:{'\n'}
//       {'{'}
//       {'\n  '}"class": "{inlineCompletion}",
//       {'\n  '}"name": "{inlineCompletion}",
//       {'\n  '}"mantra": "{inlineCompletion}"{'\n'}
//       {'}'}
//     </Inline>
//   );
// }

// await wandb.init();

// console.log(
//   await AI.createRenderContext().render(
//     <WeightsAndBiasesTracer log={wandb.log}>
//       <CharacterGenerator />
//     </WeightsAndBiasesTracer>
//   )
// );

// await wandb.finish();
