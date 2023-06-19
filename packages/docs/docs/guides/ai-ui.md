# AI + UI

Demo video: [![Loom video](../../docs/loom.png)](https://www.loom.com/share/79ca3706839049a2beaf70f75950f86f)

This is experimental but we're excited about it as a first step towards AI-native app development. Try it if you dare! There are two versions: NextJS Server Side Rendering, and create-react-app pure client. The create-react-app version is generally more robust and easier to play around in.

## create-react-app

To run the demo, go to the monorepo root, and run:

```
yarn turbo run dev --scope create-react-app-demo
```

The subdemos are:

- JIT UI: React (`packages/create-react-app-demo/src/recipe/page.tsx`): We provide building block components, and the AI decides how to assemble them into the final output.
- Choose your own adventure (`packages/create-react-app-demo/src/choose-your-adventure/index.tsx`); We teach the AI how to render text and buttons, and it chooses what to show.

### How To

If you're nesting AI and UI components, you need to import our custom React wrapper:

```tsx
/** @jsx AI.createElement */
/** @jsxFrag AI.Fragment */
import * as AI from 'ai-jsx/react';

function MyComponent() {
  return (
    <>
      <ReactComponent>
        <AI.jsx>
          <AIComponent>
            <AI.React>
              <ReactComponent />
            </AI.React>
          </AIComponent>
        </AI.jsx>
      </ReactComponent>
    </>
  );
}
```

## NextJS

To run the demo, go to the monorepo root, and run:

```
yarn turbo run dev --scope nextjs-demo
```

For this demo, we've set up a hacked version of NextJS to support server-side rendering with seamless integration of AI.JSX and React components. The subdemos are:

- Basic completion (`packages/nextjs-demo/src/app/basic-completion/page.tsx`): Streaming the AI's response directly to the browser.
- JIT UI: React (`packages/nextjs-demo/src/app/recipe/page.tsx`): We provide building block components, and the AI decides how to assemble them into the final output.
- Sleep (`packages/nextjs-demo/src/app/z/page.tsx`): An AI app with non-trivial business logic, streamed to the client.

### How To

1.  Import the `ai-jsx/next` module:

    ```tsx
    import * as AI from 'ai-jsx/next';
    ```

1.  Use the `AI.jsx` component to convert between React and AI.JSX components:

    ```tsx
    <ResultContainer title={`AI lists ten facts about ${query}`}>
      <AI.jsx>
        <ChatCompletion temperature={1}>
          <UserMessage>Give me ten facts about {query}</UserMessage>
        </ChatCompletion>
      </AI.jsx>
    </ResultContainer>
    ```

1.  Within an `AI.jsx` subtree, you can use `AI.React` to nest React components. If they are internally rendered to
    a string (e.g. as part of a prompt), they will be serialized to JSX. Otherwise they will be emitted by the top-level
    `AI.jsx` component.

        ```tsx
        <ReactComponent>
          <AI.jsx>
            <AIComponent>
              <AI.React>
                <ReactComponent />
              </AI.React>
            </AIComponent>
          </AI.jsx>
        </ReactComponent>
        ```

### Limitations & Implementation Notes

#### Limitations

This won't deploy to Vercel because we haven't published ai-jsx yet.

The types are all broken, but we may be able to fix it with https://devblogs.microsoft.com/typescript/announcing-typescript-5-1/#decoupled-type-checking-between-jsx-elements-and-jsx-tag-types and the other new features in TS 5.1.

##### Interactivity

To make the generated AI components interactive, we need to use client (rather than server) components. When I tried to do this, I ran into issues. I don't think they're worth sorting now, as it would be a rabbit hole. I think we can get the same overall effect with pure client components, which I'll explore in a later PR. I also don't think this indicates a fundamental flaw in the approach.

### JSX Hackery

The dev has to import `src/examples/nextjs/src/app/react.ts` instead of the normal `react` anywhere they want to use both React and AI.JSX in the same tree. And that file needs to keep `knownLLMxTags` updated.

##### Next Fork

We need to make a small change to the NextJS build system for this to work.

1. I first tried to add NextJS as a submodule, but that felt like overkill for the one-line change we needed to make. (If we do go down this path, we should use shallow cloning to avoid adding 1.5gb to this repo.)
1. I then tried to publish my own NextJS fork, but the NextJS build system threw errors that I couldn't resolve after ten minutes of trying.
1. So I landed on a `postinstall` script that edits `node_modules` manually. 😈

#### Misc

When `node_modules/keyv/src/index.js` is imported by the Next build process, it'll create this warning:

```
Critical dependency: the request of a dependency is an expression

Import trace for requested module:
../../../node_modules/keyv/src/index.js
../../../node_modules/cacheable-request/dist/index.js
../../../node_modules/got/dist/source/core/index.js
../../../node_modules/got/dist/source/index.js
../../lib/wandb.ts
../../lib/log.ts
../../lib/index.ts
./src/app/ai.tsx
./src/app/page.tsx
```

because of this:

```js
const adapters = {
  redis: '@keyv/redis',
  rediss: '@keyv/redis',
  mongodb: '@keyv/mongo',
  mongo: '@keyv/mongo',
  sqlite: '@keyv/sqlite',
  postgresql: '@keyv/postgres',
  postgres: '@keyv/postgres',
  mysql: '@keyv/mysql',
  etcd: '@keyv/etcd',
  offline: '@keyv/offline',
  tiered: '@keyv/tiered',
};
if (options.adapter || options.uri) {
  const adapter = options.adapter || /^[^:+]*/.exec(options.uri)[0];
  return new (require(adapters[adapter]))(options);
}
```
