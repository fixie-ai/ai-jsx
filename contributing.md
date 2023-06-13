Overview video: [![Loom video](./docs/loom.png)](https://www.loom.com/share/79ca3706839049a2beaf70f75950f86f)

Project vision: [Aspirational README](./docs/internal/aspirational-readme.md)

[Strategy Notion doc](https://www.notion.so/fixieai/AI-JSX-Design-159fde6bf8d6466487eac3d4ee1f9a93?pvs=4) (Fixie internal only)

[Docs for external dev users](./docs/about.md).

## Working in this repo

### Monorepo

We use [TurboRepo](https://turbo.build/repo) and [yarn workspaces](https://yarnpkg.com/features/workspaces/#gatsby-focus-wrapper) to manage the [monorepo](https://turbo.build/repo/docs/handbook).

```
# Run a command at the top level:
$ yarn test

# Run a command for a particular monorepo package
$ yarn workspace ai-jsx add my-package-name
```

If one monorepo package depends on another, the dependee compiles its TS files to `dist`. If you change a dependee, be sure to run `build` so `dist` is updated.

**Run all commands from the monorepo root, via `yarn workspace ...` or `yarn turbo ...`. Running directly from the monorepo packages is not guaranteed to work.**

### Known Issues

If you run `yarn build` from the monorepo root, the `examples:build` task will sometimes run before the `ai-jsx:build` task completes. I thought I configured turborepo to mark the latter as a dependency of the former and thus they should run sequentially, but that doesn't seem to be happening.

To resolve this, manually run `yarn workspace ai-jsx build` before running `yarn workspace examples build`.

### Demos

Our primary means of manual verification that things are working is the demos. You can see a full list in [examples/package.json](./packages/examples/package.json). (It's all the `scripts` that start with `demo:`.)

Run a demo like this:

```
# Build the ai-jsx package.
yarn workspace ai-jsx run build

# Replace demo:reddit with the name of your demo
yarn workspace examples run demo:reddit
```

Most demos will produce results using the [inspector](./packages/ai-jsx/src/inspector/console.tsx), a bare-bones [Ink](https://github.com/vadimdemedes/ink) app:

![inspector screenshot](./docs/inspector.png)

The inspector shows the program output on the left hand side, and the debug tree on the right. The debug tree gives you some (imperfect) visibility into how your program was constructed. Use the left and right arrow keys to step through the debug tree.

Some key demos:

- `demo:reddit`: Basic Docs QA
- `demo:router`: Natural Language Router
- `demo:debate`: Chat model used to generate competing sides in a debate
- [AI UI](./docs/guides/ai-ui.md).
