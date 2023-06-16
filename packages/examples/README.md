# AI. JSX Examples

This directory contains a bunch of examples of mini-apps built with [AI. JSX](https://ai-jsx.com).

To run any of these examples, from the top level of the `ai-jsx` repo, run:

```
$ export OPENAI_API_KEY=<Your OpenAI API key>
$ yarn && yarn build
$ yarn workspace examples run demo:<example-name>
```

where `<example-name>` is the name of the example you want to run. For example,

```
$ yarn workspace examples run demo:debate
```

to run the `debate` example.

You will need to get an API key for OpenAI from the [OpenAI API dashboard](https://platform.openai.com/account/api-keys) and set the `OPENAI_API_KEY` environment variable, in order for the
examples to invoke the OpenAI language models.

These apps run directly with Node and do not have a web UI of their own.
For examples of apps with a web UI, see the [create-react-act-demo](../create-react-app-demo) and [nextjs-demo](../nextjs-demo) directories.
