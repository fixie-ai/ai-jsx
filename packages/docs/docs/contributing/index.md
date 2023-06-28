# Contributing

Contributions are welcome! This is a multidisciplinary project, so skillsets ranging from AI researcher to UI engineer are valuable.

Contribution ideas:

- Build something and let us know what's easy/challenging/surprising.
- Experiment with ways to embed AI directly in UIs and discover which best practices / patterns emerge.
- Look at the `batteries` (e.g. `NaturalLanguageRouter`, `UseTools`) and rework them / build alternate versions.
- Build better dev tools. The Ink app is pretty rough. Maybe we want a web app?
- Build out other currently-unimplemented ideas from the [aspirational README](https://github.com/fixie-ai/ai-jsx/blob/main/docs/internal/aspirational-readme.md).

## Example Demos

If you implement a new feature, it's best to add an [example](https://github.com/fixie-ai/ai-jsx/tree/main/packages/examples/src).

Follow these steps to make a new demo.

1. Create a new file at `packages/examples/src/my-demo-directory/index.tsx`.
1. Add an entry for your demo to `packages/examples/package.json`:

   ```json
   "scripts": {
     "demo:your-demo": "tsx src/my-demo-directory/index.tsx",
   }

   ```

1. Add the your demo to that file. For example:

   ```tsx
   import * as AI from 'ai-jsx';
   import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
   import { showInspector } from 'ai-jsx/core/inspector';

   function App() {
     return (
       <ChatCompletion>
         <SystemMessage>You are an assistant who only uses one syllable words.</SystemMessage>
         <UserMessage>Why is the sky blue?</UserMessage>
       </ChatCompletion>
     );
   }

   showInspector(<App />);
   ```

1. Run the demo with:

   ```
   # Make sure you've run this at least once since cloning the repo,
   # or making any changes in packages/ai-jsx
   yarn build

   yarn workspace examples run demo:your-demo
   ```

## Publishing

To publish:

1. During your PR:
   1. Make sure the `version` field in `packages/ai-jsx/package.json` has been incremented in accordance with [semver](https://semver.org/).
   1. Update the [changelog](../changelog.md).
1. After your PR is merged:
   1. `cd packages/ai-jsx`
   1. `npm publish`

This will create a bunch of temp files in your current working directory. To remove them, run `git clean -fd`.
