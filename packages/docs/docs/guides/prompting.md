---
sidebar_position: 2
---

# Prompting in AI.JSX

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

To configure the output of `ChatCompletion`, use `ModelProps` (`packages/ai-jsx/src/core/completion.tsx`). This allows you to do things like making the model more creative or precise, telling the model how long a response you want back, etc. Combined with the natural language of your [prompt](./brand-new.md#prompt-engineering), this is how you control the model's output.

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

## Primitives to get you prompting faster

We have included a small set of prompts that we found useful in [`packages/ai-jsx/src/batteries/prompts.tsx`](https://github.com/fixie-ai/ai-jsx/blob/main/packages/ai-jsx/src/batteries/prompts.tsx).
You can use them either as shortcuts, or as a starting point if you are new to prompting:

```tsx
function App() {
  // Asking the model to respond as if they were a React developer
  return (
    <ChatCompletion>
      <Prompt persona="a React developer" />
      <UserMessage>What is JSX?</UserMessage>
    </ChatCompletion>
  );
}
```

## Getting the AI to say the right thing: constrained output

Sometimes you want the model to respond in a certain format (e.g. JSON or YAML), but doing so reliably can be hard.
We provide some primitives to help with that:

```tsx
function App() {
  return (
    <>
      JSON generation example:{'\n'}
      <JsonChatCompletion>
        <UserMessage>
          Create a random object describing an imaginary person that has a "name", "gender", and "age".
        </UserMessage>
      </JsonChatCompletion>
      {'\n\n'}
      YAML generation example:{'\n'}
      <YamlChatCompletion>
        <UserMessage>
          Create a random object describing an imaginary person that has a "name", "gender", and "age".
        </UserMessage>
      </YamlChatCompletion>
    </>
  );
}
```

Under the hood, this model will use a combination of prompting, validating the output, and asking them the model to retry
if the validation fails (refer to [`packages/ai-jsx/src/batteries/constrained-output.tsx`](https://github.com/fixie-ai/ai-jsx/blob/main/packages/ai-jsx/src/batteries/constrained-output.tsx)).
