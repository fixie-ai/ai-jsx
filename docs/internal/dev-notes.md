# Misc Dev Notes

## ESM / CJS
If we want to have separate ESM and CJS exports, we can't have `"type": "module"` in `package.json`. `"type": "module"` gives us errors like this:

```
src/batteries/langchain-wrapper.ts:1:52 - error TS1479: The current file is a CommonJS module whose imports will produce 'require' calls; however, the referenced file is an ECMAScript module and cannot be imported with 'require'. Consider writing a dynamic 'import("langchain/document_loaders/base")' call instead.
  To convert this file to an ECMAScript module, change its file extension to '.mts', or add the field `"type": "module"` to '/Users/nth/code/ai-jsx/packages/ai-jsx/package.json'.

1 import { BaseDocumentLoader, DocumentLoader } from 'langchain/document_loaders/base';
```

If we change the importing file to be called `.mts` instead of `.ts`, the error goes away. However, I'm not sure what the equivalent is for `.tsx` files.

If I remove `"moduleResolution": "node16",`, then many of the errors go away, but now TS can't find any types from `ink`. Maybe we just accept this, or do a manual cast (something like `const f: typeof import('ink') = require('ink')`)?

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
