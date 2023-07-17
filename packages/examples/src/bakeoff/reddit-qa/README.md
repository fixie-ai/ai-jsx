# Reddit DocsQA

**tl;dr:** I think this bakeoff shows promise that we could develop something in the LangChain style that's ~2x better. Once we add JSX, I'm hoping to get closer to ~10x.

## Setup

**Goal:** Create an LLM app that answers customer questions, using context from Reddit's knowledge base.

First, we run [`./load-articles`](./load-articles.mts) to fetch data from Reddit's Zendesk and save it locally as JSON.

Then, in each of LangChain and AI.JSX, we use local ETL and an in-memory vector store to answer questions.

```
# From the repo root
$ yarn workspace examples demo:reddit:etl

$ yarn workspace examples demo:reddit:lc
$ yarn workspace examples demo:reddit
```

## Caveats

I implemented the docs part of AI.JSX in [`docs.ts`](../../../../ai-jsx/src/batteries/docs.tsx). It's mostly wrappers around LangChain, with a nicer API.

In the steady state, I expect to see a combination of API shims allowing LangChain interop, as well as AI.JSX native implementations.

This is a toy example, and as such, my `docs.ts` is also fairly toy-like. In some ways, this comparison cheats, because the AI.JSX docs API can look very clean, because it's not forced into supporting a wide range of production use-cases. Despite that, I think the comparison is still directionally illustrative.

## Analysis

### Output

The AI.JSX sample streams the three prompt responses in parallel, with no manual effort on the part of the user. I think that's pretty neat.

The AI.JSX imperative sample, and the LangChain sample, do not stream. I don't know how much effort would be involved in getting LangChain to stream.

### Dev Experience

Following the LangChain docs, I reached for `JSONLoader`. I wanted to use it to load JSON docs that looked like:

```json
{
  "id": 10516331142932,
  "url": "https://reddit.zendesk.com/api/v2/help_center/en-us/articles/10516331142932.json",
  "html_url": "https://support.reddithelp.com/hc/en-us/articles/10516331142932-How-do-I-add-images-in-comments-",
  "created_at": "2022-11-01T19:02:48Z",
  "title": "How do I add images in comments?",
  "locale": "en-us",
  "body": "/* ... HTML content */"
}
```

Incredibly, the `JSONLoader` produced LangChain documents where the `pageContent` was an arbitrarily-selected field from the JSON doc. (Sometimes it was `body`, sometimes it was `created_at`, etc.) This is totally useless and frustrating.

Also, it's not clear how you'd set `metadata` with the `JSONLoader`.

This increases my conviction that LangChain is trying to reinvent the wrong things – there are many ways in the NodeJS ecosystem to load a JSON file. No one is asking for another.

### Observability

LangChain's logs are verbose yet also manage to omit key info like what model is being called. I also don't know how to turn them off.

AI.JSX's logs are saved to `ai-jsx.log`, and are viewable with `yarn view-logs`. (The subcommand there has affordances for filtering logs as well.) It includes info like what models are being called, and allows you to observe the input/output of the docs chunking process.

### Code Readability: AI.JSX vs. LangChain

I think the AI.JSX is substantially more readable than LC. Abstraction derives power from encapsulation; I think LC chose the wrong things to encapsulate.

In this example, with AI.JSX, the caller has easy and obvious control over how the docs are formatted, for instance (in the `ShowDoc` component). This is made very straightforward with JSX's component affordances. By contrast, if I wanted to change how LC was formatting my docs, it's not obvious where to look, let alone how to make the change I want.

### Code Readability: Imperative AI.JSX vs. LangChain

I believe the imperative AI.JSX is more readable than LC. Looking at the code, it's obvious:

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
