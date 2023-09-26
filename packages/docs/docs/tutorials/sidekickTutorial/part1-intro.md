---
sidebar_position: 1
---

# Part 1 - Introduction to Sidekicks

## Welcome

In this tutorial, we're going to create a Sidekick for GitHub. Before we jump in, you might be
asking, "What is a Sidekick and why do I care?" Those are great questions!

:::info What is a sidekick?
A Sidekick is an embeddable, AI-powered conversational assistant. Sidekicks augment the main experience provided in an application.
Sidekicks are experts in their given domain, can dynamically call out to other APIs, and are able to generate rich user interfaces
dynamically at runtime.
:::

### Why Build a Sidekick

There are many reasons to build a Sidekick for your website or application. A couple highlights:

**End-user Experience** → An embedded Sidekick is an AI-powered assistant that can serve as a guide to end-users. The content is rich and dynamic and is much more relevant and engaging than canned FAQ's.

**Provide Support** → Sidekicks can be trained on your website, docs, or any other content that is relevant and can respond with the right answer to complex and varied questions from end-users.

## What You Will Learn & Build

This tutorial is broken up into multiple parts. They are designed to be followed in sequence.

In this tutorial you will:

- Learn about Fixie Sidekicks, understand how they work, and when to use them.
- Build and deploy a working Sidekick for GitHub.
- Understand the value of DocsQA (AKA RAG), tools, and generative UI.
- Gain the knowledge and have resources to go deeper and start building custom Sidekicks of your own.

:::tip Pre-requisites

This tutorial requires you to have a GitHub account and to generate a read-only API access token. This enables us to build a Sidekick that can call out to the GitHub APIs so we can demonstrate how Sidekicks use tools.

The tutorial provides step-by-step instructions on how to create and use this API access token in a safe way. If you don't have a GitHub account, you can [create one](https://github.com/join) for free.
:::

<!-- ## Overview of AI.JSX and Fixie Capabilities -->

<!-- ### Opportunities AI.JSX Provides in Web Development -->

## Introducing: Sidekicks

Sidekicks are AI-powered chatbots that can be embedded in a web page or app. They can
answer questions, call APIs, and more. AI.JSX makes it easy to build Sidekicks with a rich UI, access to
documents, and the ability to fetch live data and take action via API calls.

### Demo of Final Project

The completed code for what you will build today can be found [on GitHub](https://github.com/fixie-ai/sidekick-github). If you get stuck along the way you can always reference the code there for help. We encourage you to resist simply copying the final code but to instead work through the tutorial so that you learn the key concepts along the way.

### Key features and capabilities of Sidekicks

Fixie Sidekicks are built using JavaScript and React and are powered by AI-JSX. Out of the box, Sidekicks support:

- **LLM Integration** → Simple integration with any LLM. When the Sidekick is hosted on Fixie, you have access to GPT-3.5 Turbo, GPT-4-8k, GPT-4-32k, Claude2, Claude Instant, and the Llama2...all without having to bring your own API keys.
- **RAG** → Retrieval Augmented Generation (which we call "DocsQA" in Sidekicks) enables you to provide new knowledge (in the form of URLs, documents, or any other data) to the Sidekick.
- **Prompt Components** → Construct your system/base prompts through JSX components.
- **Tools** → Extend your Sidekick's abilities. Access external data or call an external API.
- **Generative UI** → Move beyond simple, text-based chat and let your Sidekick create dynamic UI based on the user's needs.
- **Hosting on Fixie** → Deploy to Fixie with a single step.

## Sidekicks Quickstart

The [Sidekicks Quickstart](../../sidekicks/sidekicks-quickstart) will take you through setting up your development environment and getting a template project up and running.

_Note: you do not need to create your own Document Collection as is mentioned at the end of the quickstart._

Once you complete the quickstart, you will be ready for [Part 2 - DocsQA](./part2-docsQA).
