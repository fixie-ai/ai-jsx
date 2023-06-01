# Loop DocsQA

**tl;dr:** I think this bakeoff shows promise that we could develop something in the LangChain style that's ~2x better. Once we add JSX, I'm hoping to get closer to ~10x.

## Setup

**Goal:** Create an LLM app that answers customer questions, using context from Loop's knowledge base.

First, we run [`./load-articles`](./load-articles.mts) to fetch data from Loop's Zendesk and save it locally as JSON.

Then, in each of LangChain and AI.JSX, we use local ETL and an in-memory vector store to answer questions.

```
# From the repo root
$ yarn tsx src/examples/bakeoff/loop-qa/load-articles.mts

$ yarn tsx src/examples/bakeoff/loop-qa/langchain.mts
$ yarn tsx src/examples/bakeoff/loop-qa/ai-jsx-imperative.mts
```

## Caveats

This example **does not use JSX** due to other work that's in-flight; I'll update this later with the JSX version. However, we still exercise the non-JSX parts of the framework.

(Even once that other work lands, I still think it's valuable to see the JSX vs. imperative side-by-side so we can assess how much value we're getting from the JSX.)

I implemented the docs part of AI.JSX in [`docs.ts`](../../../lib/docs.ts). It's mostly wrappers around LangChain, with a nicer API.

In the steady state, I expect to see a combination of API shims allowing LangChain interop, as well as AI.JSX native implementations.

This is a toy example, and as such, my `docs.ts` is also fairly toy-like. In some ways, this comparison cheats, because the AI.JSX docs API can look very clean, because it's not forced into supporting a wide range of production use-cases. Despite that, I think the comparison is still directionally illustrative.

## Analysis

### Code Readability

I believe the AI.JSX is more readable. Looking at the code, it's obvious:

- What model is being called
- What params/prompts that model is being called with

In the LangChain code, I looked in the following places, but couldn't find the same info:

- The user-land code
- A few LangChain source files
- The LangChain logging
- The wandb logging

The AI.JSX implementation is also more type-safe; when you construct a `document`, AI.JSX correctly carries through the
shape of your metadata, whereas LangChain downscales it to a very vague type.

This comparison increases my conviction that chains are the wrong abstraction; I think they hide more than they help.

### Dev Experience

Following the LangChain docs, I reached for `JSONLoader`. I wanted to use it to load JSON docs that looked like:

```json
{
  "id": 4407718614171,
  "url": "https://ridewithloop.zendesk.com/api/v2/help_center/en-us/articles/4407718614171.json",
  "html_url": "https://help.ridewithloop.com/hc/en-us/articles/4407718614171-What-is-the-minimum-required-limit-of-liability-in-TX-",
  "created_at": "2021-10-01T20:39:54Z",
  "title": "What is the minimum required limit of liability in TX?",
  "locale": "en-us",
  "body": "/* ... HTML content */"
}
```

Incredibly, the `JSONLoader` produced LangChain documents where the `pageContent` was an arbitrarily-selected field from the JSON doc. (Sometimes it was `body`, sometimes it was `created_at`, etc.) This is totally useless and frustrating.

Also, it's not clear how you'd set `metadata` with the `JSONLoader`.

This increases my conviction that LangChain is trying to reinvent the wrong things – there are many ways in the NodeJS ecosystem to load a JSON file. No one is asking for another.

### Observability

LangChain's logs are verbose yet also manage to omit key info like what model is being called. I also don't know how to turn them off.

AI.JSX's logs are saved to `llmx.log`, and are viewable with `yarn view-logs`. (The subcommand there has affordances for filtering logs as well.) It includes info like what models are being called, and allows you to observe the input/output of the docs chunking process.
