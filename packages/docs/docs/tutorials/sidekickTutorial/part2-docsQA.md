---
sidebar_position: 2
---

# Part 2 - Document Question + Answering (DocsQA)

:::note What we cover in part 2
In [Part 1](./part1-intro) we got introduced to Sidekicks, set-up our dev machine, and deployed the template Sidekick to Fixie. In Part 2, we are going to:

- Learn about Document Question + Answering (DocsQA).
- Perform some queries against an existing document collection.
- Add a document collection to our Sidekick.
- Learn how to create a new docs collection.

:::

## DocsQA Overview

One of the common use cases for a Fixie Sidekick is to answer questions about a collection of documents, such as web pages or PDF files. By providing a Large Language Model with information drawn from a set of documents, the Sidekick can do an excellent job answering questions and having a conversation with the user about the contents of those documents. This approach is called Retrieval-Augmented Generation, or RAG, and is a popular way of using LLMs.

Fixie Sidekicks makes it easy to do this, as the Fixie service can handle all of the details of crawling documents, building embedding, managing a vector database, and all of the other machinery involved in developing a RAG-based application.

_For more details about DocsQA in Sidekicks, read the [Sidekicks Document Q&A](../../sidekicks/sidekicks-docsqa) guide._

## Using the Git + GitHub Document Collection

When creating a new collection, there is time required to crawl the content, create chunks from the it, and then generate and store embeddings. In the interest of time, we have already created a document collection for use in the tutorial.

The collection has two sources: [Git docs](https://git-scm.com/doc) and [GitHub docs](https://docs.github.com/en).

### Run some queries

In the Fixie Dashboard, go into [Documents](https://console.fixie.ai/documents). This is where you can view all the Document Collections that you and/or your organization have created.

1. Click on the card for the ["Git + GitHub" Collection](https://console.fixie.ai/documents/b72ad16f-19fc-42d0-b053-69ab84f1e121).
1. Click on ["Query Test"](https://console.fixie.ai/documents/b72ad16f-19fc-42d0-b053-69ab84f1e121/query-test).
1. Try the following queries:

- `what is a repository`
- `what is the gh cli`
- `how does rerere work`

For each query that you run, you will notice that you are getting back a list of chunks. These chunks were created when Fixie crawled the sources for the document collection. Each chunk also has a score that indicates how similar the chunk is to the query (higher scores mean higher similarity).

### Hooking up to our Sidekick

1. Add the following line to your project's index.tsx file:

```jsx
const FIXIE_CORPUS_ID: string = 'b72ad16f-19fc-42d0-b053-69ab84f1e121';
```

2. Serve up these changes and do some queries using the Sidekick interface in the Fixie Dashboard:

```bash
npx fixie@latest serve
```

In Part 3 we are going to do some work on the system prompt to make thing work even better.

## Kick-Starters

This section provides some optional, suggested exercises you can do to go deeper and really "kick"-start your usage of Sidekicks.

### Creating a new Document Collection

Use the [Fixie Dashboard](https://console.fixie.ai/documents) to create a new collection based on your company's website and product docs. Or make a collection for an organization you care about. Once you have created the new collection and added sources, you can use the Document Collection ID and replace the one for Git + GitHub in your project.

### Query Chunks via the Corpus API

Fixie provides the [`Corpus API`](https://docs.fixie.ai/category/corpus-api) for working with Document Collections (AKA corpora), sources, chunks, and documents. Go check out this API and use it to [perform a query](https://docs.fixie.ai/api/corpus/fixie-corpus-service-query-corpus) instead of using the UI in the Fixie Dashboard as we did above.
