<p align="center">
  <img src="https://docs.ai-jsx.com/img/ai-jsx.png" alt="AI.JSX logo" width="100" />
</p>

# AI.JSX — The AI Application Framework for Javascript

[![Docs Site](https://img.shields.io/badge/Docs%20Site-docs.ai--jsx.com-orange)](https://docs.ai-jsx.com)
[![Discord Follow](https://dcbadge.vercel.app/api/server/MsKAeKF8kU?style=flat)](https://discord.gg/MsKAeKF8kU)
[![Twitter Follow](https://img.shields.io/twitter/follow/fixieai?style=social)](https://twitter.com/fixieai)

AI.JSX is a framework for building AI applications using [JSX](https://react.dev/learn/writing-markup-with-jsx). With AI.JSX, you don't just use JSX to describe what your UI should look like, you also use it to describe how **AI (LLMs)** should integrate into the rest of your application. The end result is a powerful combination where _intelligence_ can be deeply embedded into the application stack.

AI.JSX is designed to give you two important capabilities out of the box:

1. A powerful mechanism for orchestrating multiple LLM calls expressed as modular, re-usable components.
1. The ability to seamlessly interweave UI components with your AI compoents. This means you can rely on the LLM to construct your UI dynamically from a set of React components you provide.

AI.JSX can be used to create standalone LLM applications that can be deployed anywhere Node.JS is supported, or it can be used as part of a larger React application. We have examples that use [Next.js](https://github.com/fixie-ai/ai-jsx/tree/main/packages/nextjs-demo) and [Create React App](https://github.com/fixie-ai/ai-jsx/tree/main/packages/create-react-app-demo). For more details, see our [AI+UI guide](https://docs.ai-jsx.com/guides/ai-ui).

To get started, see the quickstart below, read our [Getting Started Guide](https://docs.ai-jsx.com/getting-started), or check out the [examples](https://github.com/fixie-ai/ai-jsx/tree/main/packages/examples).

To learn more about why we built AI.JSX, you can read our [blog post](https://blog.fixie.ai).

## Quickstart

The fastest way to get started is to [clone our template repo](https://github.com/fixie-ai/ai-jsx-template). But here's how to do it manually:

Create your folder and `cd` into it:

```console
mkdir ai-jsx-example && cd ai-jsx-example
```

Install Typescript:

```console
npm i typescript --save-dev
```

Initialize a new Typescript project:

```console
npx tsc --init
```

Install `ai-jsx`:

```console
npm i ai-jsx --save-dev
```

Set up your `package.json`:

```json
{
  "name": "ai-jsx-hello-world",
  "version": "0.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "typecheck": "tsc",
    "start": "npm run typecheck && tsx index.tsx"
  },
  "dependencies": {
    "ai-jsx": "^0.2.0-4"
  },
  "devDependencies": {
    "@tsconfig/node18": "^2.0.1",
    "tsx": "^3.12.7",
    "typescript": "^5.1.3"
  }
}
```

Create a new `index.tsx` file with the following:

```tsx
import * as LLMx from 'ai-jsx';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';

function App() {
  return (
    <ChatCompletion>
      <SystemMessage>You are an agent that only gives snarky, sarcastic advice.</SystemMessage>
      <UserMessage>How can I learn about Ancient Egypt?</UserMessage>
    </ChatCompletion>
  );
}

console.log(await LLMx.createRenderContext().render(<App />));
```

## Features

- Prompt engineering through modular, reusable components
- The ability to easily switch between model providers and LLM configurations (e.g., temperature)
- Built in support for Tools (ReAct pattern), Document Question and Answering, Chain of Thought, and more
- Ability to directly interweave LLM calls with standard UI components, including the ability for the LLM to render the UI from a set of provided components
- Built-in streaming support
- First-class support for NextJS and Create React App (more coming soon)
- Full support for LangChainJS

## Examples

For a full set of examples, see [the examples package](https://github.com/fixie-ai/ai-jsx/tree/main/packages/examples).

## Contributing

We welcome contributions! See [Contributing](./contributing.md) for how to get started.
