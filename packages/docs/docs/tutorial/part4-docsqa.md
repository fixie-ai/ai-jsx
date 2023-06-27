---
sidebar_position: 4
---

# Tutorial Part 4 - Document Q&A

One of the most powerful capabilities of Large Language Models is the ability to
answer questions about the contents of a set of documents. AI.JSX provides a powerful
component called [`<DocsQA>`](../api/modules/batteries_docs#docsqa) that can answer a question about a corpus of documents
using the LLM.

Here's an example of how this will look in your app:

```tsx filename="packages/tutorial/src/docsqa.tsx"
<DocsQA question="When did the storm occur?" corpus={corpus} chunkLimit={5} chunkFormatter={GetChunk} />
```

## How does Documents Q&A work?

There are many ways of using LLMs to perform some form of document question and answering.
The particular approach implemented by `DocsQA` is described as follows.

First, we construct a _corpus_ from a set of documents -- which might be plain text, HTML,
Markdown, or some other format. We break the source documents into a series of _chunks_
that are individually processed by the LLM. Each chunk is passed into the LLM,
and the _text embedding_ representing the chunk is computed. (For more details on text
embeddings, check out the [OpenAI text embeddings API docs](https://platform.openai.com/docs/guides/embeddings).) The text embedding is a multidimensional vector, calculated by the LLM,
representing the semantic content of the chunk. A _corpus_ consists of a set of document chunks and their corresponding embedding vectors.
For a more detailed explanation of how a corpus is prepared and used, see the guide [DocsQA: Grounding Answers with a Source of Truth](https://docs.ai-jsx.com/guides/docsqa#overview).

When a question is posed to the corpus, we first pass the question to the LLM and extract
its own embedding vector. The chunks with the highest cosine similarity to the question
are then gathered from the corpus, and the LLM is invoked with the contents of the
most relevant document chunks and the original question.

The implementation of `<DocsQA>` in AI.JSX currently stores the chunks and embedding
vectors in memory. One could also use a vector database to store the embedding vectors, and
in the near future we'll be adding support for this to AI.JSX.

The [`<DocsQA>`](../api/modules/batteries_docs#docsqa) component takes in several props:

- `question` - the query to submit to the LLM about this document corpus.
- `corpus` - the corpus of documents to search for the answer.
- `chunkLimit` - the maximum number of document chunks to consider in formulating the response.
- `chunkFormatter` - a component that will format each document chunk as it is presented to the LLM.

## Creating a corpus

The first step is to create a corpus that you want the LLM to answer questions about.
In this example, we'll create a corpus that consists of a single
Wikipedia article, one about [Hurricane Katrina](https://en.wikipedia.org/wiki/Hurricane_Katrina).

```tsx filename="packages/tutorial/src/docsqa.tsx"
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
await corpus.load();
```

We first fetch the contents of the web page and convert it to Markdown using
the [Turndown](https://github.com/mixmark-io/turndown) library. We then create
a [`LocalCorpus`](../api/classes/batteries_docs.LocalCorpus) from this Markdown content.

Calling [`corpus.load()`](../api/classes/batteries_docs.LocalCorpus#load) will cause the corpus to be loaded into memory.
This is an async operation, since loading the documents and generating vectors
can take a while, but for this demo we `await` the result.

## Querying the corpus

Once we have a corpus, we use the `<DocsQA>` component to query it:

```tsx filename="packages/tutorial/src/docsqa.tsx"
function GetChunk({ chunk }: { chunk: ScoredChunk }) {
  return chunk.chunk.content;
}

function App() {
  return (
    <>
      <DocsQA question="What was Hurricane Katrina?" corpus={corpus} chunkLimit={5} chunkFormatter={GetChunk} />
      {'\n\n'}
      <DocsQA question="Which dates did the storm occur?" corpus={corpus} chunkLimit={5} chunkFormatter={GetChunk} />
      {'\n\n'}
      <DocsQA
        question="Where were the strongest winds reported?"
        corpus={corpus}
        chunkLimit={5}
        chunkFormatter={GetChunk}
      />
    </>
  );
}
```

The `<GetChunk>` component is used to format each document chunk as it is presented
to the LLM. In this case, we just return the raw text of the chunk, but if we wanted
to include some additional metadata, or transformed the chunks in some way before
processing them, we could have done so.

## Using a Pinecone database

Until now, we have been using an in-memory Corpus, which is good for a demo, but in practice you might want to use a vector database like [Pinecone](https://www.pinecone.io/) or [Chroma](https://www.trychroma.com/) instead.

To do so, you can use [LangchainCorpus](../api/classes/batteries_docs.LangChainCorpus) to integrate with any [VectorStore from LangChain.js](https://js.langchain.com/docs/modules/indexes/vector_stores/integrations/) like so:

```tsx
const corpus = new LangchainCorpus(await getVectorStore());
```

Here is an example where we build a DocsQA component from an existing Pinecone index:

```tsx
async function getVectorStore(): Promise<VectorStore> {
  const client = new PineconeClient();
  await client.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
  });

  const vectorStore = await PineconeStore.fromExistingIndex(new OpenAIEmbeddings(), {
    pineconeIndex: client.Index(process.env.PINECONE_INDEX);,
    namespace: process.env.PINECONE_NAMESPACE,
  });
  return vectorStore;
}
```

Once we have a `VectorStore` object, we wrap it with a `LangChainCorpus`:

```tsx
const corpus = new LangchainCorpus(await getVectorStore());
```

The above assumes that the vector store is already populated, but you can also use the same syntax as before to add documents to it:

```tsx
// or use a loadable corpus
const corpus = new LoadableLangchainCorpus(await getVectorStore(), staticLoader(docs), makeChunker(600, 100));
await corpus.load();
```

Once you have the `corpus` object, you can ask questions from it just as before:

```tsx
function App() {
  return (
    <>
      <DocsQA question="What was Hurricane Katrina?" corpus={corpus} chunkLimit={5} chunkFormatter={GetChunk} />
      {'\n\n'}
      <DocsQA question="Which dates did the storm occur?" corpus={corpus} chunkLimit={5} chunkFormatter={GetChunk} />
    </>
  );
}
```

<!-- Alternatively, [Fixie](https://www.fixie.ai) also provides a fully-managed Corpus solution you could drop in instead. -->
