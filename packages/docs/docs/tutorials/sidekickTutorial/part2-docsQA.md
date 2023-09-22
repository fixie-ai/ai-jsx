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

TODO

### Why use DocsQA

TODO

### How it Works

TODO

## Using the Git + GitHub Document Collection

When creating a new collection, there is time required to crawl the content, create chunks from the it, and then generate and store embeddings. In the interest of time, we have already created a document collection for use in the tutorial.

The collection has two sources: [Git docs](https://git-scm.com/doc) and [GitHub docs](https://docs.github.com/en).

### Run some queries

In the Fixie Console, go into [Documents](TODO)

TODO

### Hooking up to our Sidekick

Add the following line to your project's index.tsx file:

```jsx
const FIXIE_CORPUS_ID: string = 'b72ad16f-19fc-42d0-b053-69ab84f1e121';
```

## Extra Credit: Creating a new Document Collection

TODO
