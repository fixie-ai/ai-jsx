import { Jsonifiable } from 'type-fest';

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
export type Chunk = <T extends string | Document>(text: T) => Promise<T[]>;

/**
 * Load data from a source.
 *
 * This method returns documents. However, depending on the size of your documents and your context window, you may
 * wish to chunk those docs further. To do that, use a `Chunk` method.
 *
 * In LangChain, there are loaders and retrievers. In AI.JSX, there are only loaders. Retrievers are a special
 * of loaders.
 */
export type Load = (...args: any[]) => Promise<Document[]>;

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
