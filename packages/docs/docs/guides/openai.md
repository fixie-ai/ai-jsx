# OpenAI

To use OpenAI, do one of the following:

## Set the API key env var

**When to do this:** your AI.JSX program runs in a controlled environment (e.g. a server), or you're comfortable sharing your API key with the client (e.g. you're doing a hackathon or building an internal tool).

You may do this with any of the [Architecture Patterns](./architecture.mdx).

**How to do this:** Set the `OPENAI_API_KEY` env var. (You can get this key from the [OpenAI API dashboard](https://platform.openai.com/account/api-keys))

:::note create-react-app
If your project is build on create-react-app, you'll want to set `REACT_APP_OPENAI_API_KEY` instead. ([More detail.](https://create-react-app.dev/docs/adding-custom-environment-variables/))
:::

## Set a proxy env var

**When to do this:** you have a proxy server that you'd like to use for OpenAI calls.

You would do this with the [UI + AI.JSX on the client; API calls on the server](./architecture.mdx#ui--aijsx-on-the-client-api-calls-on-the-server) architecture pattern. (Nothing stops you from doing it for the other patterns, but this is the one for which it's most likely to be useful.)

**How to do this:** Set the `OPENAI_API_BASE` env var. This value will be passed directly to the `openai` client lib ([source code](https://github.com/openai/openai-node/blob/dc821be3018c832650e21285bade265099f99efb/base.ts#L22)). The default value is `https://api.openai.com/v1`.

Examples:

```console
# When you have a standalone proxy server
OPENAI_API_BASE=https://my-proxy-server/api

# When you're running on the client, and want to make a request to the origin.
OPENAI_API_BASE=/openai-proxy
```

:::note create-react-app
If your project is build on create-react-app, you'll want to set `REACT_APP_OPENAI_API_BASE` instead. ([More detail.](https://create-react-app.dev/docs/adding-custom-environment-variables/))
:::

## Set a model provider in your JSX

:::caution
This is only needed in rare cases.
:::

**When to do this:** you want explicit control and the above options don't work for you.

**How to do this:**

```tsx
// Use openai-edge because the base `openai` package doesn't support streaming in edge environments.
// Use the @nick.heiner fork because of https://github.com/dan-kwiat/openai-edge/issues/6.
import { Configuration, OpenAIApi } from '@nick.heiner/openai-edge';

// Create a custom OpenAI client.
const client = new OpenAIApi(
  new Configuration({
    apiKey: 'my-key',
  })
);

function App() {
  return (
    // Explicitly provide the client and model to use.
    // highlight-next-line
    <OpenAI client={client} chatModel="gpt-3.5-turbo">
      <ChatCompletion>
        <SystemMessage>You are an assistant who only uses one syllable words.</SystemMessage>
        <UserMessage>Why is the sky blue?</UserMessage>
      </ChatCompletion>
    </OpenAI>
  );
}
```
