# JSX: Build System Considerations

:::tip
Understanding these details is for power users. If you just want to get started quickly, clone [the template repo](https://github.com/fixie-ai/ai-jsx-template).
:::

Using JSX requires a build system. Since most projects use TypeScript, the easiest way to do this is via the TS compiler. To enable this, set the following `compilerOptions`:

```json file="tsconfig.json"
"compilerOptions": {
  "jsx": "react",
  "jsxFactory": "LLMx.createElement",
  "jsxFragmentFactory": "LLMx.Fragment",
}
```

If you're using `esbuild`, there are [similar settings](https://esbuild.github.io/content-types/#using-jsx-without-react).

If you're using `babel`, you want to configure [`babel-plugin-transform-react-jsx`](https://babeljs.io/docs/babel-plugin-transform-react-jsx) such that it uses `ai-jsx` instead of React.

<!-- TODO: Update the babel notes once we have a more robust UI integration story. -->

We also recommend putting the following in your `tsconfig.json`:

```json file="tsconfig.json"
"compilerOptions": {
  "module": "esnext",
  "moduleResolution": "nodenext",
  "esModuleInterop": true,
}
```

However, this may vary based on your project's other ESM settings.
