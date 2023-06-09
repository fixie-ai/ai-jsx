# Getting the AI to say things

- Prereqs:
  - [Basic AI knowledge](brand-new.md)
  - [Rules of JSX](rules-of-jsx.md)

A core part of AI apps is prompting the model and getting a response. To do that in AI.JSX, start with `ChatCompletion`:

```tsx
function App() {
  return (
    <ChatCompletion>
      <UserMessage>Tell me a story about ducks.</UserMessage>
    </ChatCompletion>
  );
}
```

`ChatCompletion` is preferred because all the most powerful models are chat-based, and [it's best to start with the most powerful models](./brand-new.md#recommended-dev-workflow).

To configure the output of `ChatCompletion`, use [`ModelProps`](../../packages/ai-jsx/src/core/completion.tsx). This allows you to do things like making the model more creative or precise, telling the model how long a response you want back, etc. Combined with the natural language of your [prompt](./brand-new.md#prompt-engineering), this is how you control the model's output.

## What about non-chat models?

Chat models have stronger "instructability", meaning they follow your instructions better.

Conversely, non-chat Completion models are just trained to predict the next token, so you might see output like this:

```
Input:
  what is the capital of North Dakota?

Output:
  what is the capital of South Dakota?
  what is the capital of Indiana?
  what is the capital of New York?
```

The problem is that the model is predicting that a question about one state is often followed by questions about other states.
