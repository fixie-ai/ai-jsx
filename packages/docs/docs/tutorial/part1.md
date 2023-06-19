---
sidebar_position: 1
---

# Tutorial Part 1 - The basics

In this tutorial, we're going to introduce the basic concepts of AI.JSX one step at
a time. All of the code for these tutorials can be found on GitHub at
https://github.com/fixie-ai/ai-jsx/tree/main/packages/tutorial.

Let's start with the basic "hello world" example for AI.JSX,
which invokes a Large Language Model with a fixed prompt, and
prints the result to the console. Here is the complete
application:

```tsx filename="packages/tutorial/src/part1.tsx"
import * as AI from 'ai-jsx';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';

const app = (
  <ChatCompletion>
    <UserMessage>Write a Shakespearean sonnet about AI models.</UserMessage>
  </ChatCompletion>
);

const renderContext = AI.createRenderContext();
const response = await renderContext.render(app);
console.log(response);
```

You can run this yourself from the AI.JSX tree by running:

```
yarn workspace tutorial run part1
```

## How it works

The first part of the code defines the variable `app`, which
consists of a JSX component tree that will be rendered by the
AI.JSX runtime. This is very similar to React, which uses
JSX components to generate a DOM tree. Here, we are using JSX
to describe the structure of the LLM model invocations and prompts
in a compact, declarative way.

The `<ChatCompletion>` component is the root of the tree, and is responsible
for generating a single invocation of the LLM -- in this case, OpenAI's
ChatGPT model -- and returning the result. The `<UserMessage>` component
simply tags the prompt as being the "user" component of the prompt -- as opposed
to `<SystemMessage>`, which would be the "system" component of the prompt. These
distinctions are used by OpenAI's API to differentiate between the fixed, system aspect
of the prompt and the variable, user aspect of the prompt.

In order to actually get a result, we need to pass our application to a
`RenderContext` and call `render()` on it. The `RenderContext` is responsible
for managing the state of the application and progressively evaluating the state
of the application as it is rendered. The `render()` method returns a `Promise`
that evaluates to a string, which is the final result of rendering the JSX
object tree.

We get a `RenderContext` by calling `AI.createRenderContext()`, and then
call `render()` on it with our `app` object. The result is a string that
we print to the console.
