## Limitations

### Interactivity
To make the generated AI components interactive, we need to use client (rather than server) components. When I tried to do this, I ran into issues. I don't think they're worth sorting now, as it would be a rabbit hole. I think we can get the same overall effect with pure client components, which I'll explore in a later PR. I also don't think this indicates a fundamental flaw in the approach.

## JSX Hackery

The dev has to import `src/examples/nextjs/src/app/react.ts` instead of the normal `react` anywhere they want to use both React and AI.JSX in the same tree. And that file needs to keep `knownLLMxTags` updated.

### Next Fork

We need to make a small change to the NextJS build system for this to work.

1. I first tried to add NextJS as a submodule, but that felt like overkill for the one-line change we needed to make. (If we do go down this path, we should use shallow cloning to avoid adding 1.5gb to this repo.)
1. I then tried to publish my own NextJS fork, but the NextJS build system threw errors that I couldn't resolve after ten minutes of trying.
1. So I landed on a `postinstall` script that edits `node_modules` manually. 😈

## Misc

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
