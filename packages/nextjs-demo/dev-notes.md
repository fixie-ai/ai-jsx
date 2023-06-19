## Limitations

This won't deploy to Vercel because we haven't published ai-jsx yet.

The types are all broken, but we may be able to fix it with https://devblogs.microsoft.com/typescript/announcing-typescript-5-1/#decoupled-type-checking-between-jsx-elements-and-jsx-tag-types and the other new features in TS 5.1.

### Interactivity

To make the generated AI components interactive, we need to use client (rather than server) components. When I tried to do this, I ran into issues. I don't think they're worth sorting now, as it would be a rabbit hole. I think we can get the same overall effect with pure client components, which I'll explore in a later PR. I also don't think this indicates a fundamental flaw in the approach.

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
