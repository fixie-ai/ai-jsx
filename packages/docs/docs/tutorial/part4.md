---
sidebar_position: 4
---

# Tutorial Part 4 - Document Q&A

One of the most powerful capabilities of Large Language Models is the ability to
answer questions about the contents of a set of documents. AI.JSX provides a powerful
component called `<DocsQA>` that can answer a question about a corpus of documents
using the LLM.

Here's an example of how this will look in your app:

```tsx filename="packages/tutorial/src/part4.tsx"
<DocsQA question="When did the storm occur?" corpus={corpus} limit={5} docComponent={ShowDoc} />
```

## How does Documents Q&A work?

There are many ways of using LLMs to perform some form of document question and answering.
The particular approach implemented by `DocsQA` is described as follows.

First, we construct a *corpus* from a set of documents -- which might be plain text, HTML,
Markdown, or some other format. We break the source documents into a series of *chunks*
that are individually processed by the LLM. Each chunk is passed into the LLM,
and the *text embedding* representing the chunk is computed. (For more details on text
embeddings, check out the [OpenAI text embeddings API docs](https://platform.openai.com/docs/guides/embeddings).) The text embedding is a multidimensional vector, calculated by the LLM,
representing the semantic content of the chunk. A *corpus* consists of a set of document chunks and their corresponding embedding vectors.

When a question is posed to the corpus, we first pass the question to the LLM and extract
its own embedding vector. The chunks with the highest cosine similarity to the question
are then gathered from the corpus, and the LLM is invoked with the contents of the 
most relevant document chunks and the original question.

The implementation of `<DocsQA>` in AI.JSX currently stores the chunks and embedding
vectors in memory. One could also use a vector database to store the embedding vectors, and
in the near future we'll be adding support for this to AI.JSX.

The `<DocsQA>` component takes in several props:
* `question` - the query to submit to the LLM about this document corpus.
* `corpus` - the corpus of documents to search for the answer.
* `limit` - the maximum number of document chunks to consider in formulating the response.
* `docComponent` - a component that will format each document chunk as it is presented to the LLM.

## Creating a corpus

The first step is to create a corpus that you want the LLM to answer questions about.
In this example, we'll create a corpus that consists of a single
Wikipedia article, one about [Hurricane Katrina](https://en.wikipedia.org/wiki/Hurricane_Katrina).

```tsx filename="packages/tutorial/src/part4.tsx"
// Fetch the HTML for the Wikipedia article.
const URL = 'https://en.wikipedia.org/wiki/Hurricane_Katrina';
const html = await fetch(URL).then((response) => response.text());

// Convert the HTML to Markdown using the Turndown library.
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
