---
displayed_sidebar: docsSidebar
---

# Getting Started with AI.JSX

This is a quickstart guide to [AI.JSX](https://ai-jsx.com).

## AI.JSX Hello World

To use any of the AI.JSX examples (which use the OpenAI large language models), you first need to
obtain an OpenAI API key from the [OpenAI API dashboard](https://platform.openai.com/account/api-keys).

For a quick "hello world" of AI.JSX in action, do this:

```
$ export OPENAI_API_KEY=<your OpenAI API key>
$ git clone https://github.com/fixie-ai/ai-jsx-template
$ cd ai-jsx-template
$ npm install
$ npm start
```

You should see output like:

```
Oh, wond'rous beast of language, vast and strong,
Whose depths of knowledge ne'er have been surpassed,
A marvel wrought by human mind and thought,
At once both tool and servant to be sought.
[...]
```

## Building and Running the AI.JSX Demo Apps

The AI.JSX GitHub repository has a number of demo apps. It will be useful to have your own
checkout of the AI.JSX repo and be able to build the demos from there.

The following commands should build the entire AI.JSX repo:

```
$ git clone https://github.com/fixie-ai/ai-jsx
$ cd ai-jsx
$ yarn
$ yarn build
```

You will find examples in the directories `packages/examples`, `packages/tutorial`,
`packages/create-react-app-demo`, and `packages/nextjs-demo`.

You can then run the various examples from the top level of the `ai-jsx` checkout using
`yarn workspace`, like so:

```
$ yarn workspace tutorial run part1
$ yarn workspace examples run demo:debate
$ yarn workspace create-react-app-demo start
```

## Next Steps

Now that you have some basic examples working, learn more about AI.JSX development
by following the [tutorial](./tutorials/part1-completion.md).
