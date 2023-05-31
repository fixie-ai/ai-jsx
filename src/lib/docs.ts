import { Jsonifiable } from 'type-fest';

export interface Document<Metadata extends Jsonifiable = Jsonifiable> {
  pageContent: string;
  metadata: Metadata;
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
