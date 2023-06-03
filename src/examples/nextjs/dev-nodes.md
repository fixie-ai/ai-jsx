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