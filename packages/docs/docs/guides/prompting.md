---
sidebar_position: 3
---

# Prompting in AI.JSX

## Prerequisites

Before jumping into this guide on prompting, there are a couple of other guides we suggest you read first:

- [Guide for AI Newcomers](../ai-newcomers.md) - Good resource if you are new to working with LLMs.
- [Rules of AI.JSX](rules-of-jsx.md) - How AI.JSX uses JSX, does error handling, and performs memoization.

## The Power of Chat-Based Models

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

[`ChatCompletion`](../api/modules/core_completion?_highlight=chatcompletion#chatcompletion) is preferred to [`Completion`](../api/modules/core_completion?_highlight=chatcompletion#completion) because all the most powerful models are chat-based, and [it's best to start with the most powerful models](../ai-newcomers.md#recommended-dev-workflow).

To configure the output of `ChatCompletion`, use [`ModelProps`](../api/interfaces/core_completion.ModelProps.md). This allows you to do things like making the model more creative or precise, telling the model how long a response you want back, etc. Combined with the natural language of your [prompt](../ai-newcomers.md#prompt-engineering), this is how you control the model's output.

## The Problem with Non-Chat Models

Chat models have stronger "instructability". This just means they follow your instructions better.

Conversely, non-chat completion models are just trained to predict the next token. With a non-chat model, you might see something like this:

```
Input:
  what is the capital of North Dakota?

Output:
  what is the capital of South Dakota?
  what is the capital of Indiana?
  what is the capital of New York?
```

Instead of giving us "Bismarck", the actual capital of North Dakota, the model is predicting that a question about one state is often followed by questions about other states.

## Prompting Primitives Get You Started Faster

We have included a small set of prompts that we found useful via [`<Prompt />`](../api/modules/batteries_prompts#prompt). We think they serve as a great starting point and help provide some productivity shortcuts for you. Here's an example:

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

## Constrained Output

Sometimes it's important we get the AI model to respond in a particular way. We want the model to respond with the correct information **and** present the information in a specific way. For example, we might want the response to be formatted as JSON or YAML.

Doing this reliably can be hard which is why AI.JSX provides the "constrained-output" module to help with this type of formatting. Under the hood, the module uses a combination of prompting, validating the output, and retries if the validation fails. See [`ai-jsx/batteries/constrained-output`](../api/modules/batteries_constrained_output) for more information.

### Example: Returning JSON and YAML

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

### Custom Schema Enforcement

You can also provide your own schema and then have AI.JSX enforce it in the output:

```tsx
// We use `zod` library to create and enforce the schema
import z from 'zod';

const FamilyTree: z.Schema = z.array(
  z.object({
    name: z.string(),
    children: z.lazy(() => FamilyTree).optional(),
  })
);

function App() {
  return (
    <JsonChatCompletion schema={FamilyTree}>
      <UserMessage>Create a nested family tree with names and ages. It should include a total of 5 people</UserMessage>
    </JsonChatCompletion>
  );
}
```
