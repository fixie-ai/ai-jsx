# Misc Dev Notes

## ESM / CJS
If we set `"moduleResolution": "node16"`, then some dependency modules work well, and others work work. Also, having it means we need to put file extensions on all import targets, which causes problems when we export to CJS.

To resolve this, I removed `"moduleResolution": "node16"` and accepted that we'll have worse types on Ink.

I tried to go full CommonJS, but that makes Ink fail, because it contains a dep with a top-level `await`, which only works from ESM.

If I remove `"module": "esnext",` from the consuming package's `tsconfig.json`, TS throws an error on every import to `@fixieai/ai-jsx`.

If we have any `require`s, then the ESM-only build will fail. 

Is the CJS build completely useless as long as we're using Ink + any other Sindre package?

## TypeScript / `tsx`

If you pass the `--tsconfig` flag to `tsx`, it needs to be before the entry point:

```
tsx --tsconfig tsconfig.json my-file.ts
```

If you pass it at the end, it's silently ignored:

```
# Won't work
tsx my-file.ts --tsconfig tsconfig.json
```
