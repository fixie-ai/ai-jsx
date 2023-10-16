# AI.JSX — The AI Application Framework for Javascript

[![Docs Site](https://img.shields.io/badge/Docs%20Site-docs.ai--jsx.com-orange)](https://docs.ai-jsx.com)
[![Discord Follow](https://dcbadge.vercel.app/api/server/MsKAeKF8kU?style=flat)](https://discord.gg/MsKAeKF8kU)
[![Twitter Follow](https://img.shields.io/twitter/follow/fixieai?style=social)](https://twitter.com/fixieai)

## About AI.JSX

AI.JSX is a framework for building AI applications using Javascript and JSX. With AI.JSX, you get great tools for prompt engineering and can have the LLM render React components in its response (instead of only text). This means you can provide a set of React components and let the LLM construct your UI dynamically at runtime. AI.JSX also provides native support for tools, Document Question & Answering, and much more.

AI.JSX can be used to create standalone LLM applications that can be deployed anywhere Node.js is supported, or it can be used as part of a larger React application.

## Features

AI.JSX comes with the following features out-of-the-box:

- **Componetized** → LLM prompt engineering through modular, reusable components.
- **Model Support** → Use OpenAI, Anthropic, Llama2, or BYOM. Seamlessly switch between model providers and LLM config (e.g. temperature).
- **Complete AI Toolbox** → Built-in support for Tools, Document Question and Answering, and more.
- **Generative UI** → Seamlessly interweave LLM calls with standard UI components. LLM can dynamically render UI from a set of components you provide.
- **Streaming** → Built-in streaming support.
- **Modern Web Stack Support** → First-class support for NextJS and Create React App. (more coming soon)
- **LangChain Integration** → Full support for LangChainJS.

## Learning AI.JSX

To get started with AI.JSX, follow these steps:

1. Check out the [Getting Started Guide](https://docs.ai-jsx.com/getting-started).
1. Run through the [AI.JSX Tutorial](https://docs.ai-jsx.com/category/tutorial).
1. Say "Hello AI World" by cloning the [ai-jsx-template](https://github.com/fixie-ai/ai-jsx-template).
1. Discover many more use cases in the [examples package](https://github.com/fixie-ai/ai-jsx/tree/main/packages/examples).
1. If you're new to AI, read the [Guide for AI Newcomers](https://docs.ai-jsx.com/ai-newcomers).

## Examples

Here is a simple example using AI.JSX to generate an AI response to a prompt:

```tsx
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

You can play with live demos on our [live demo app](https://ai-jsx-nextjs-demo.vercel.app/) or view [the source code](./packages/nextjs-demo/).
For a full set of examples, see [the examples package](https://github.com/fixie-ai/ai-jsx/tree/main/packages/examples).

#### Check-out the 2 minute [intro video](https://github.com/fixie-ai/ai-jsx/assets/476553/301b79e4-7023-4adc-a3a5-72d5b7af0cde).

## Contributing

We welcome contributions! See the [Contribution Guide](packages/docs/docs/contributing/index.md) for details on how to get started.

## License

AI.JSX is open-source software and released under the [MIT license](https://opensource.org/license/mit).
