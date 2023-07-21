# Models

AI.JSX supports [OpenAI](https://openai.com/) and [Anthropic](https://www.anthropic.com/).

:::tip Getting started?
Most people should start with OpenAI's GPT-4 model.

If you need a very long context window, use Anthropic's Claude 100k.

([More detail](./brand-new.md#recommended-dev-workflow))

:::

## Choosing a Model

The model provider will be chosen according to the following:

1. If the `OPENAI_API_KEY` env var is set, OpenAI will be used.
1. If the `ANTHROPIC_API_KEY` env var is set, and OpenAI is not set, Anthropic will be used. (If they're both set, OpenAI wins.)
1. If neither is set, the model provider must be set explicitly in your JSX:

```tsx
<ChatProvider component={AnthropicChatModel} model="claude-1">
  <App />
</ChatProvider>
```

:::note Which strategy should I use?

- If you want to use the same model everywhere, [set an env var](#setting-the-model-via-env-var).
- If you want to use different models for different parts of your program, [set it explicitly](#setting-the-model-explicitly)

:::

## Setting the Model Via Env Var

Using env vars, you can instruct AI.JSX to use a model provider directly, or use a proxy.

### Set the API key env var

**When to do this:** your AI.JSX program runs in a controlled environment (e.g. a server), or you're comfortable sharing your API key with the client (e.g. you're doing a hackathon or building an internal tool).

You may do this with any of the [Architecture Patterns](./architecture.mdx).

**How to do this:**

- Set the `OPENAI_API_KEY` env var. (You can get this key from the [OpenAI API dashboard](https://platform.openai.com/account/api-keys))
- Or, set the `ANTHROPIC_API_KEY` env var.

:::note create-react-app
If your project is build on create-react-app, you'll want to set `REACT_APP_OPENAI_API_KEY` or `REACT_APP_ANTHROPIC_API_KEY` instead. ([More detail.](https://create-react-app.dev/docs/adding-custom-environment-variables/))
:::

### Set a proxy env var

:::caution OpenAI only

This is only supported for OpenAI. [File an issue](https://github.com/fixie-ai/ai-jsx/issues) if you'd like to see it for Anthropic!

:::

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

## Setting the Model Explicitly

:::info Why would I want to do this?

If you don't have a strong sense that you need this, don't worry about it. Start with GPT-4 and return to this if you have issues.

Models have different strengths and weaknesses. GPT-4 is considered to have the best reasoning ability, but Claude-100k can consider far more information at once. Or you may wish to delegate some parts of your program to open source HuggingFace models which have less constrained output than the big corporate models.

:::

You can use the JSX `ChatProvider` and `CompletionProvider` components to explicitly set the model in use:

```tsx
<ChatProvider component={AnthropicChatModel} model="claude-1">
  <App />
</ChatProvider>
```

If you have multiple layers of nesting, the closest parent wins:

```tsx
<ChatProvider component={AnthropicChatModel} model="claude-1">
  {/* components here will use claude-1 */}
  <ChatProvider component={AnthropicChatModel} model="claude-1-100k">
    {/* components here will use claude-1-100k */}
  </ChatProvider>
</ChatProvider>
```

If there is no `ChatProvider` or `CompletionProvider` parent, [the default model provider](#choosing-a-model) will be used.

For an example, see [multi-model-chat](https://github.com/fixie-ai/ai-jsx/blob/main/packages/examples/src/multi-model-chat.tsx).

## Llama2

[Llama2](https://huggingface.co/docs/transformers/main/model_doc/llama2) is an open-source model from Facebook. Because it's open source, there's no single model provider like OpenAI or Anthropic. Instead, people run it in their own environment. As a result, if you want to run Llama2, you need to pass a `fetchLlama2` prop that tells AI.JSX where your endpoint is.

For example, we can see how this is done for Replicate:

```tsx
export function ReplicateLlama2(
  /* The defaults are the default values passed to Llama2, like temperature */
  { children, ...defaults }: { children: Node } & Llama2ModelProps,
  { logger }: AI.ComponentContext
) {
  const replicate =
    /* get the client instance */

    async function* fetchLlama2(input: FetchLlama2Args) {
      const result =
        /* call the Replicate API */

        /**
         * The Replicate API happens to not support streaming - it just gives us the generation all at once.
         * So we just yield and return it immediately. However, if we had an API that supported streaming,
         * we would yield each intermediate chunk.
         */
        yield result;
      return result;
    };

  return (
    /* Bind all children to Llama2, using our fetcher */
    <Llama2 {...defaults} fetchLlama2={fetchLlama2}>
      {children}
    </Llama2>
  );
}
```

This would be used in our code like:

```tsx
import { ReplicateLlama2 } from 'ai-jsx/lib/llama2';

<ReplicateLlama2>
  <ChatCompletion>
    <UserMessage>I'd like to book a flight.</UserMessage>
  </ChatCompletion>
</ReplicateLlama2>;
```

### Llama2 is completion, not chat

Most big, modern models you're familiar with, like those from OpenAI and Anthropic, are chat. OpenAI has structured request/responses to fit a chat pattern, and Anthropic's models are tuned to follow pattern like:

```
Human: How are you?
Assistant: Great!
```

Llama2 is a completion model, which means it will sometimes follow the human/assistant pattern, but not always. It's just trying to predict subsequent text.

So if you give a Completion model a prompt like:

```
Human: Hi, how are you?
Assistant: I'm doing well, how are you?
Human: I'm good. What is your name?
```

You may get a completion like:

```
Assistant: Sam. What's yours?
Human: Chris.
Assistant: That's great. How old are you?
Human: 43.
```

In this example, we see the model is writing out the rest of the conversation, since it predicts that the
human and assistant will continue talking. A chat model would never do this – it would just return the
assistant's response and then stop.

For your convenience, if you have a `<ChatCompletion>` component that uses Llama2, it'll be polyfilled in an attempt to make Llama2 behave like a chat model:

```tsx
import { ReplicateLlama2 } from 'ai-jsx/lib/llama2';

<ReplicateLlama2>
  <ChatCompletion>
    <UserMessage>I'd like to book a flight.</UserMessage>
  </ChatCompletion>
</ReplicateLlama2>;
```

However, you may get better results if you use a `Completion` component directly, and do more specific prompt engineering to get the model to do what you want.
