## Limitations

- This won't deploy to Vercel because:
  - We've set this up as a nested project within the overall ai-jsx repo. If we did a proper monorepo setup, we could deploy. (This is easy; I just haven't taken the time to do it.)
  - I needed to make a small tweak in `node_modules` to make the compiler work. (This can be easily worked around with a forked version of the NextJS SDK, but to find an actual solution, we'd probably want to coordinate with the NextJS team.)

## JSX Hackery

In order to make this work, I changed `src/examples/nextjs/node_modules/next/dist/build/babel/preset.js` to use `classic` instead of `automatic` here:

```js
...useJsxRuntime ? {
    runtime: "classic"
}
```

The dev also has to import `src/examples/nextjs/src/app/react.ts` instead of the normal `react` anywhere they want to use both React and AI.JSX in the same tree. And that file needs to keep `knownLLMxTags` updated.

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
