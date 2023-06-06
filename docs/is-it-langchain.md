# Is This LangChain?

AI.JSX is complementary to LangChain in some ways, and overlapping with it in others.

## AI.JSX interops easily with LangChain's ecosystem

LangChain has some useful integrations with various ecosystem tools, like:

- [PDF file loader](https://js.langchain.com/docs/modules/indexes/document_loaders/examples/file_loaders/pdf)
- [Loader](https://js.langchain.com/docs/modules/indexes/document_loaders/examples/file_loaders/unstructured) for [Unstructured](https://www.unstructured.io/)
- [Chroma Vector DB](https://js.langchain.com/docs/modules/indexes/vector_stores/integrations/chroma)
- [Pinecone Vector DB](https://js.langchain.com/docs/modules/indexes/vector_stores/integrations/pinecone)

These are easy to use from AI.JSX, because they're just functions:

```tsx
import { PineconeClient } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/completion-components';

function getVectorStore() {
  const client = new PineconeClient();
  await client.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
  });
  const pineconeIndex = client.Index(process.env.PINECONE_INDEX);

  const vectorStore = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings(),
    { pineconeIndex }
  );
}

function MyDocsFunction({query}: {query: string}) {
  const docs = await getVectorStore().similaritySearch(query);
  return <ChatCommpletion>
    <SystemMessage>
      You are a knowledge base agent who answers questions based on these docs: {JSON.stringify(docs)}
    </SystemMessage>
    <UserMessage>{query}</UserMessage>
  </ChatCompletion>
}
```

You use anything else LangChain offers, like chains and prompt templates, because they're all just functions you can call and then insert the results into your JSX.

## Where AI.JSX and LangChain Overlap

We think JSX is a superior abstraction for organizing LLM-based applications than [chains](https://js.langchain.com/docs/modules/chains/). We think JSX offers:

- A better set of primitives
- that can be declaratively and explicitly composed
- leading to an abstraction that's both easier to understand and more flexible

We also think that JSX's high quality affordances for composing strings make prompt templates unnecessary.
