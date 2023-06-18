---
sidebar_position: 4
---

# Tutorial Part 4 - Document Q&A

One of the most powerful capabilities of Large Language Models is the ability to
answer questions about the contents of a set of documents. AI.JSX provides a powerful
component called `<DocsQA>` that can answer a question about a corpus of documents
using the LLM.

Here's an example of how this will look:

```tsx filename="packages/tutorial/src/part4.tsx"
<DocsQA question="When did the storm occur?" corpus={corpus} limit={5} docComponent={ShowDoc} />
```

Here, the `<DocsQA>` component takes in several props:
* `question` - the query to submit to the LLM about this document corpus.
* `corpus` - the corpus of documents to search for the answer.
* `limit` - the maximum number of document chunks to consider in formulating the response.
* `docComponent` - a component that will format each document chunk as it is presented to the LLM.

## Creating a document corpus

The first step is to create a corpus of documents that you want the LLM to answer
questions about. In this example, we'll create a corpus that consists of a single
Wikipedia article, one about [Hurricane Katrina](https://en.wikipedia.org/wiki/Hurricane_Katrina).

```tsx filename="packages/tutorial/src/part4.tsx"
// Fetch the HTML for the Wikipedia article.
const URL = 'https://en.wikipedia.org/wiki/Hurricane_Katrina';
const html = await fetch(URL).then((response) => response.text());

// Convert the HTML to Markdown.
const turndownService = new TurndownService();
const markdown = turndownService.turndown(html);

// Create a LocalCorpus from this content.
const docs = [
  {
    pageContent: [markdown],
    name: 'Wikipedia Article about Hurricane Katrina',
  },
];
const corpus = new LocalCorpus(staticLoader(docs), makeChunker(600, 100));
await corpus.startLoading();
```

Here, a `LocalCorpus` holds all of the document contents in memory -- soon we will
be adding support to AI.JSX for offline data storage, such as vector databases.
