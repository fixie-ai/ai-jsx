import { DocsQA, ScoredChunk, LangchainCorpus } from 'ai-jsx/batteries/docs';
import { showInspector } from 'ai-jsx/core/inspector';

import { PineconeClient } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { VectorStore } from 'langchain/vectorstores';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

const settings = {
  apiKey: process.env.PINECONE_API_KEY!,
  environment: process.env.PINECONE_ENVIRONMENT!,
  index: process.env.PINECONE_INDEX!,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  namespace: 'ai-jsx-tutorial-part4',
};

function GetChunk({ doc }: { doc: ScoredChunk }) {
  return doc.chunk.content;
}

async function getVectorStore(): Promise<VectorStore> {
  const client = new PineconeClient();
  await client.init({
    apiKey: settings.apiKey,
    environment: settings.environment,
  });
  const pineconeIndex = client.Index(settings.index);
  // await pineconeIndex.delete1({ deleteAll: true, namespace: settings.namespace });

  const res = await pineconeIndex.describeIndexStats({ describeIndexStatsRequest: { filter: {} } });
  console.log('res', res);

  const embedder = new OpenAIEmbeddings({
    modelName: 'text-embedding-ada-002',
    openAIApiKey: settings.openaiApiKey,
  });

  if (res.namespaces === undefined || !(settings.namespace in res.namespaces)) {
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
      namespace: settings.namespace,
    });
    return vectorStore;
  }

  console.log("Namespace exists. Loading it's index ...");
  const vectorStore: VectorStore = await PineconeStore.fromExistingIndex(embedder, {
    pineconeIndex,
    namespace: settings.namespace,
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
