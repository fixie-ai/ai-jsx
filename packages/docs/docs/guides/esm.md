# ESM

AI.JSX exports both CJS and ESM files. When you `import` or `require` `ai-jsx`, you'll get the file that matches the module system you're using. If you have a problem with this, please let us know by either [dropping us a line in Discord](https://discord.fixie.ai) or by [opening an issue](https://github.com/fixie-ai/ai-jsx/issues) on GitHub.

## Known Issues

You may see errors in VS Code like:

```ts
import * as ai from 'ai-jsx';
                    ^^^^^^^^
                    Cannot find module 'ai-jsx' or its corresponding type declarations.ts(2307)
```

However, when you run `tsc`, you don't get an error.

When VS Code and `tsc` give contradictory results, it may mean that VS Code's magic for finding your `tsconfig` isn't working. This can happen if your `tsconfig` is in an unusual place or has an unusual name.

To resolve it, put a `tsconfig.json` somewhere that VS Code will find it – probably the root of your package. If you have a reason that you want your `tsconfig.json` to live elsewhere, you can make your newly-added `tsconfig.json` just a proxy to the real one:

```json
{
  "extends": "./path/to/my/real/tsconfig.json.json",
  "include": ["**/my/files"]
}
```
