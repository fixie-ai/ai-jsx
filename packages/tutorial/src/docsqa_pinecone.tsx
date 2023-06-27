/**
 * This example shows how to use the PineconeStore with a LangChainCorpus for DocsQA.
 * This is a more advanced version of `docsqa.tsx`, which uses a {@link LocalCorpus} so
 * make sure to check that out first.
 *
 * Since a Pinecone database is used, you need to make sure you have a Pinecone account,
 * and an index created before running it. Check out the `pineconeConfig` object below which
 * uses environment variables to store the Pinecone API key, environment, and index name.
 *
 * Once you have all of that set up, you can run this example with:
 * ```bash
 *    yarn workspace tutorial run part4_pinecone
 * ```
 * @packageDocumentation
 */
import { DocsQA, ScoredChunk, LangchainCorpus } from 'ai-jsx/batteries/docs';
import { showInspector } from 'ai-jsx/core/inspector';

import { PineconeClient } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { VectorStore } from 'langchain/vectorstores';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

const pineconeConfig = {
  apiKey: process.env.PINECONE_API_KEY!,
  environment: process.env.PINECONE_ENVIRONMENT!,
  index: process.env.PINECONE_INDEX!,
  namespace: 'ai-jsx-tutorial-part4',
};

function GetChunk({ doc }: { doc: ScoredChunk }) {
  return doc.chunk.content;
}

/**
 * Creates a PineconeStore from the ai-jsx docs.
 * If the namespace exists however, it will not re-index the documents.
 *
 * Note: make sure to set the environment variables for the Pinecone API key,
 * environment, and index name first.
 *
 * @returns a PineconeStore
 */
async function getVectorStore(): Promise<VectorStore> {
  const client = new PineconeClient();
  await client.init({
    apiKey: pineconeConfig.apiKey,
    environment: pineconeConfig.environment,
  });
  const pineconeIndex = client.Index(pineconeConfig.index);

  const res = await pineconeIndex.describeIndexStats({ describeIndexStatsRequest: { filter: {} } });

  const embedder = new OpenAIEmbeddings({
    modelName: 'text-embedding-ada-002',
    openAIApiKey: process.env.OPENAI_API_KEY!,
  });

  if (res.namespaces === undefined || !(pineconeConfig.namespace in res.namespaces)) {
    console.log('Namespace does not exist. Creating and indexing documents ...');

    // For this example, we will use the ai-jsx docs.
    const loader = new DirectoryLoader('../../packages/docs/docs/', {
      '.md': (path) => new TextLoader(path),
    });

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
      separators: ['\n## ', '\n###', '\n\n', '\n', ' '],
    });
    const docs = await loader.loadAndSplit(splitter);

    const vectorStore: VectorStore = await PineconeStore.fromDocuments(docs, embedder, {
      pineconeIndex,
      namespace: pineconeConfig.namespace,
    });
    return vectorStore;
  }

  console.log("Namespace exists. Loading it's index ...");
  const vectorStore: VectorStore = await PineconeStore.fromExistingIndex(embedder, {
    pineconeIndex,
    namespace: pineconeConfig.namespace,
  });
  return vectorStore;
}

const corpus = new LangchainCorpus(await getVectorStore());

function App() {
  return (
    <>
      <DocsQA
        question="What is the advantage of using JIT UI?"
        corpus={corpus}
        chunkLimit={4}
        chunkFormatter={GetChunk}
      />
      {'\n\n'}
      <DocsQA question="How can I contribute to AI.JSX?" corpus={corpus} chunkLimit={4} chunkFormatter={GetChunk} />
    </>
  );
}

showInspector(<App />);
