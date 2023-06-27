**Note:** This is still experimental. We recommend using the [NextJS demo](https://github.com/fixie-ai/ai-jsx/tree/main/packages/nextjs-demo) instead.

By default, this demo app shows the [run entirely on the client](../docs/docs/guides/architecture.mdx#run-entirely-on-the-client) architecture.

It demonstrates the [UI + AI.JSX on the client; API calls on the server](../docs/docs/guides/architecture.mdx#run-entirely-on-the-client#ui--aijsx-on-the-client-api-calls-on-the-server) architecture if you run it with this command:

```console
OPENAI_API_BASE='/v1' yarn turbo run dev --scope create-react-app-demo
```

It also demonstrates [JIT UI](../docs/docs/guides/ai-ui.md).
