import * as LLMx from '../index.js';
import { Node } from '../index.js';
import { ChatCompletion, SystemMessage, UserMessage } from '../core/completion';
import { Jsonifiable } from 'type-fest';
import log from '../core/log';
import { ObservableLangChainTextSplitter } from './langchain-wrapper';
import { TokenTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document as LangChainDocument } from 'langchain/document';
import { Embeddings } from 'langchain/embeddings/base';

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
export type Chunker = <Metadata extends Jsonifiable = Jsonifiable>(
  doc: Document<Metadata>,
  ...args: any[]
) => Promise<Document<Metadata>[]>;
export type ChunkMany = <Metadata extends Jsonifiable = Jsonifiable>(
  doc: Document<Metadata>[],
  ...args: any[]
) => Promise<Document<Metadata>[]>;

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

export interface VectorSearchResult<Metadata extends Jsonifiable = Jsonifiable> {
  document: Document<Metadata>;
  score: number;
}

/**
 * This is a simplified version of LangChain's `VectorStore`.
 */
export interface VectorStore {
  // Hmm. If we have this return value, then VectorStore['search'] does not extend `Load`.
  // If we wanted to fix this, we'd need a both `search` and `searchWithScores` method.
  // We could also have a `loadFromVectorStore` method.
  //    const loadFromVectorStore = (vs: VectorStore, query, opts) => _.map(vs.search(query, opts), 'document');

  search<Filter = unknown>(query: string, opts: { filter?: Filter; limit: number }): Promise<VectorSearchResult[]>;
}

export class DefaultInMemoryVectorStore<Metadata extends Jsonifiable = Jsonifiable> implements VectorStore {
  private constructor(private readonly langChainVectorStore: MemoryVectorStore) {}

  static async fromDocuments<Metadata extends Jsonifiable = Jsonifiable>(
    docs: Document<Metadata>[],
    embeddings: Embeddings
  ) {
    const lcMemoryStore = await MemoryVectorStore.fromDocuments(
      docs.map((doc) => toLangChainDoc(doc)),
      embeddings
    );
    return new this<Metadata>(lcMemoryStore);
  }

  async search<Filter = never>(
    query: string,
    opts: { filter?: Filter | undefined; limit: number }
  ): Promise<VectorSearchResult<Metadata>[]> {
    const docs = await this.langChainVectorStore.similaritySearchWithScore(query, opts.limit);
    return docs.map(([doc, score]) => ({
      document: doc as Document<Metadata>,
      score,
    }));
  }
}

export const defaultChunker = <Metadata extends Jsonifiable = Jsonifiable>(
  doc: Document<Metadata>,
  opts: ConstructorParameters<typeof TokenTextSplitter>
) => {
  const splitterLog = log.child({ chunkOpts: opts });
  const splitter = new ObservableLangChainTextSplitter(
    new TokenTextSplitter({
      encodingName: 'gpt2',
      chunkSize: 600,
      chunkOverlap: 100,
      ...opts,
    }),
    splitterLog
  );

  // This is complaining because {} doesn't necessary satisfy Metadata, since Metadata could have required fields.
  // However, I think it's unlikely to cause a problem in practice at this point.
  // @ts-expect-error
  doc.metadata = doc.metadata ?? {};

  return splitter.splitDocuments([
    // TS doesn't realize that we've ensured that the metadata is defined.
    // @ts-expect-error
    doc,
  ]);
};

export const defaultChunkMany = async <Metadata extends Jsonifiable = Jsonifiable>(
  docs: Document<Metadata>[],
  opts?: Parameters<ChunkMany>[1]
) => (await Promise.all(docs.map((doc) => defaultChunker(doc, opts)))).flat();

export function toLangChainDoc(doc: Document): LangChainDocument {
  return doc as LangChainDocument;
}

export interface DocsQAProps<Doc extends Document> {
  loader: Loader;
  question: string;
  docComponent: (props: { doc: Doc }) => Node;
}
export async function DocsQA<Doc extends Document>(props: DocsQAProps<Doc>) {
  const docs = await props.loader();
  return (
    <ChatCompletion>
      <SystemMessage>
        You are a customer service agent. Answer questions truthfully. Here is what you know:
        {docs.map((doc) => (
          // TODO improve types
          // @ts-expect-error
          <props.docComponent doc={doc} />
        ))}
      </SystemMessage>
      <UserMessage>{props.question}</UserMessage>
    </ChatCompletion>
  );
}
