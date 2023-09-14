---
displayed_sidebar: docsSidebar
---

# AI.JSX & LangChain

[LangChain](https://langchain.com) is a popular library available for both Python and JavaScript for building on top of LLMs. AI.JSX is designed to be complementary to LangChainJS in some ways, and overlapping with it in others.

## Where AI.JSX and LangChain Overlap

AI.JSX and LangChain both offer a means of constructing prompts, orchestrating multiple calls to LLMs, and interfacing with external data. For LangChain, this is primarily done through [prompt templates](https://js.langchain.com/docs/modules/prompts/prompt_templates/) and [chains](https://js.langchain.com/docs/modules/chains/).

In AI.JSX, we use JSX to handle both string composition (replacing prompt templates) and composition (chains). We think JSX is a superior abstraction for organizing LLM-based applications than because it offers:

- A better set of primitives
- that can be declaratively and explicitly composed
- leading to an abstraction that's both easier to understand and more flexible

### Why JSX instead of Chains?

LLM apps benefit from an orchestration framework that:

- Makes it easy to connect the outputs of one LLM call and the inputs of another
- Provides a reusability / encapsulation paradigm

The promise and peril of an abstraction comes the abstraction's choice of what to hide. Chains abstract away passing values, applying logic, and returning values. But we don't think this is the right thing to hide: we already have `function`. The chain makes you learn new semantics to do something you already knew how to do.

And as a tool for reuse, chains are too inflexible. Consider the chain `STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION`. It takes a structured description of tools, does a zero shot prompt, and uses the ReAct pattern. That's one selection from the following independent attributes:

- Structured vs unstructured
- Chat vs non-chat completion
- Zero shot vs few shot
- ReAct vs not

There are 16 possible chains that arise from the combination of these attributes. LangChain just offers a handful. What if you wanted a different combination? Or you wanted to swap out one of the layers (e.g. ReAct) with your own version?

AI.JSX solves this by offering each of the independent attributes as primitives, then letting you assemble them yourself:

```tsx
function MyComponent({ query }: { query: string }) {
  return (
    <Structured tools={myTools}>
      <ChatCompletion>
        <SystemMessage>
          <MyFewShots />
          <ReAct />
        </SystemMessage>
        <UserMessage>{query}</UserMessage>
      </ChatCompletion>
    </Structured>
  );
}
```

All the pieces are there, so you're still assembling powerful building blocks. But it's blocks you can fit together to better match your needs.

## AI.JSX interops easily with LangChain's ecosystem

LangChain has many useful integrations with various ecosystem tools, like:

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

You can use anything else LangChain offers, like chains and prompt templates, because they're all just functions you can call, the results of which can be inserted into your JSX.
