import { Jsonifiable } from 'type-fest';
import { LangChainWrapper, log } from '.';
import { TokenTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

export interface Document<Metadata extends Jsonifiable = Jsonifiable> {
  pageContent: string;
  metadata?: Metadata;
}

/**
 * Chunk text into multiple documents.
 *
 * In LangChain, this is called "split". We use the phrase "chunk", because the cannonical term for the output
 * of this process is "chunks".
 */
export type Chunker = (doc: Document, ...args: any[]) => Promise<Document[]>;

/**
 * Load Documents from a source.
 *
 * Examples of when you'd use this:
 *  * Load and parse a file into documents.
 *  * Call a remote API
 *  * Load data from a database
 *  * Do a k-nearest-neighbors search in a vector store.
 *
 * Once you have the Documents, you may wish to do some combination of:
 *  1. Inserting them directly into a prompt
 *  2. Adding them to a vector store.
 *  3. Chunking them into smaller documents (use a `Chunk` method).
 *
 * In LangChain, there are loaders and retrievers. In AI.JSX, there are only loaders. Retrievers are a special
 * case of loaders.
 */
// TODO: maybe rename to DocumentProvider
export type Loader = (...args: any[]) => Promise<Document[]>;

export interface VectorSearchResult {
  document: Document;
  score: number;
}

/**
 * This is a simplified version of LangChain's `VectorStore`.
 */
export interface VectorStore<Filter = unknown> {
  // Hmm. If we have this return value, then VectorStore['search'] does not extend `Load`.
  // If we wanted to fix this, we'd need a both `search` and `searchWithScores` method.
  // We could also have a `loadFromVectorStore` method.
  //    const loadFromVectorStore = (vs: VectorStore, query, opts) => _.map(vs.search(query, opts), 'document');

  search(query: string, opts: { filter?: Filter; limit: number }): Promise<VectorSearchResult[]>;
}

export const defaultChunker: Chunker = (doc, opts: ConstructorParameters<typeof TokenTextSplitter>) => {
  const splitterLog = log.child({ chunkOpts: opts });
  const splitter = new LangChainWrapper.ObservableLangChainTextSplitter(
    new TokenTextSplitter({
      encodingName: 'gpt2',
      chunkSize: 600,
      chunkOverlap: 100,
      ...opts,
    }),
    splitterLog
  );

  doc.metadata = doc.metadata ?? {};

  return splitter.splitDocuments([
    // TS doesn't realize that we've ensured that the metadata is defined.
    // @ts-expect-error
    doc,
  ]);
};
