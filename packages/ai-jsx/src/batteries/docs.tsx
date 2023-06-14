import { Embeddings } from 'langchain/embeddings/base';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { TokenTextSplitter } from 'langchain/text_splitter';
import _ from 'lodash';
import { similarity } from "ml-distance";
import pino from 'pino';
import { Jsonifiable } from 'type-fest';
import { ChatCompletion, SystemMessage, UserMessage } from '../core/completion.js';
import * as LLMx from '../index.js';
import { Node } from '../index.js';

// DO_NOT_SUBMIT
const pinoLogger = _.once(() =>
  // @ts-expect-error
  pino(
    { name: 'ai-jsx-docs', level: 'trace' },
    // N.B. pino.destination is not available in the browser
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    pino.destination?.({
      dest: './ai-jsx-docs.log',
      sync: true, // Synchronous logging
    })
  )
)();

/**
 * A raw document loaded from an arbitrary source that has not yet been parsed.
 */
export class RawDocument {
  constructor(
    /** The raw bytes content. */
    readonly pageContent: Uint8Array,
    /**
   * A human-readable name for this document. This identifies the document to users and should
   * be unique within a corpus. If the document is hosted on the web, its URL is a good choice.
   */
    readonly name?: string,
    /** The encoding used for this document. Defaults to utf-8. */
    readonly encoding: string = 'utf-8',
    /** The content type for this document. Defaults to plain text. */
    readonly mimeType: string = 'text/plain') {
      this.pageContent = pageContent;
      this.name = name;
      this.encoding = encoding;
      this.mimeType = mimeType;
    }
}

/**
 * A text document that can be used to ground responses.
 */
export class Document<DocumentMetadata extends Jsonifiable = Jsonifiable> {
  constructor(
    /**
   * The content of the document. While this may often be a singleton, including separate
   * meaningful pieces of text can aid in chunking/embedding.
   */
    readonly pageContent: string[],
    /**
   * A human-readable name for this document. This identifies the document to users and should
   * be unique within a corpus. If the document is hosted on the web, its URL is a good choice.
   */
    readonly name?: string,
    /**
   * Other metadata about the document, such as when it was created.
   */
    readonly metadata?: DocumentMetadata) {
      this.pageContent = pageContent;
      this.name = name;
      this.metadata = metadata;
    }
}

/**
 * A function that parses raw documents to produce text documents that can be used by an LLM.
 */
export type Parser<DocumentMetadata extends Jsonifiable = Jsonifiable> = (raw: RawDocument) => Promise<Document<DocumentMetadata>>;

function defaultParser<DocumentMetadata extends Jsonifiable = Jsonifiable>(raw: RawDocument): Promise<Document<DocumentMetadata>> {
  if (raw.mimeType.startsWith('text/')) {
    let content = new TextDecoder(raw.encoding).decode(raw.pageContent);
    return Promise.resolve(new Document([content], raw.name));
    // TODO: Add support for other mime types.
  } else {
    throw new Error(`Unsupported mime type: ${raw.mimeType}`);
  }
}

/**
 * Objects related to loading a corpus. This is facilitated by a series of
 * requests and corresponding responses.
 *
 * In addition to returning documents, each response may expand the corpus
 * space in one or both of two dimensions:
 *      Responses may include new partitions to be loaded. Partitions are
 *          non-overlapping subsets of a corpus which may be loaded in parallel.
 *          A response's new partitions will be ignored if previously included
 *          in another response.
 *      When a response includes a page of documents, that page may indicate
 *          that another page is available in the same partition. Pages are
 *          always loaded serially in order. The partition is completed when
 *          a response has a page with no next page token.
 *
 *  Loading will always begin with a  request with the default (unnamed)
 *  partition and no page token. Subsequent requests depend on prior responses
 *  and will always include at least one of those fields.
 *
 *  Examples:
 *      Simple handful of documents:
 *          The response to the initial request contains only a page of
 *          documents. This could include a next_page_token for more
 *          documents in the single default partition if needed.
 *      Web crawl:
 *          Each URL corresponds to a partition and the responses never include
 *          tokens. The initial response only includes partitions, one for each
 *          root URL to crawl. Each subsequent request includes the partition
 *          (the URL) and the corresponding response contains a page with a
 *          single document - the resource at that URL. If the document links
 *          to other resources that should be included in the corpus, the
 *          response also contains those URLs as new partitions. The process
 *          repeats for all partitions until there are no known incomplete
 *          partitions or until crawl limits are reached.
 *      Database:
 *          Consider a database with a parent table keyed by parent_id and an
 *          interleaved child table keyed by (parent_id, child_id) whose rows
 *          correspond to corpus documents. This loader will use tokens that
 *          encode a read timestamp (for consistency) and an offset to be used
 *          in combination with a static page size.
 *
 *          Upon receiving the initial request, the loader chooses a commit
 *          timestamp to use for all reads and returns a partition for each
 *          parent_id along with a first page token indicating the chosen read
 *          timestamp and an offset of 0.
 *
 *          For each partition, the loader then receives requests with the
 *          partition (a parent_id) and a page token (the read timestamp and
 *          offest). It responds with documents corresponding to the next page
 *          size child rows within the given parent. If more children exist,
 *          the response includes a next page token with the same read
 *          timestamp and an incremented offset. This repeats until there are
 *          no more children, at which point the response has no
 *          next page token and the partition is complete.
 *
 *          Note: Including multiple parent_ids in each partition would also
 *              work and would be an effective way to limit parallelism if
 *              desired.
 */
export namespace CorpusLoading {
  export class Request {
    constructor(readonly partition?: string, readonly pageToken?: string) {
      /**
       * The partition of the corpus that should be read. This will
       * be empty for the initial request, indicating the default partition.
       * For subsequent requests, it will typically be the name of a partition
       * returned by a previous request, though it could be empty if the
       * default partition contains multiple pages.
       */
      this.partition = partition;
      /**
       * A token for paginating results within a corpus partition.
       * If present, this will be echoed from a previous response.
       */
      this.pageToken = pageToken;
    }
  }

  export class Response<DocType extends RawDocument | Document> {
    constructor(readonly page?: Page<DocType>, readonly partitions?: Partition[]) {
      /** A page of documents from the requested partition. */
      this.page = page;
      /**
       * Additional partitions that should be loaded in subsequent requests.
       * These will be ignored if they were already included in a previous
       * response.
       */
      this.partitions = partitions;
    }
  }

  export class Page<DocType extends RawDocument | Document> {
    constructor(readonly documents: DocType[], readonly nextPageToken?: string) {
      /** Documents loaded into the corpus. */
      this.documents = documents;
      /**
       * If there's another page in the requested partition, the token needed
       * for requesting it.
       */
      this.nextPageToken = nextPageToken;
    }
  }

  export class Partition {
    constructor(readonly name: string, readonly firstPageToken?: string) {
      /** The unique name of this partition. */
      this.name = name;
      /** An optional token for requesting the first page. */
      this.firstPageToken = firstPageToken;
    }
  }

  /** A function responsible for loading and parsing a corpus. */
  export type Loader<DocumentMetadata extends Jsonifiable = Jsonifiable> = (request: Request) => Promise<Response<Document<DocumentMetadata>>>;

  /** A function responsible for loading a corpus when parsing is handled separately. */
  export type RawLoader = (request: Request) => Promise<Response<RawDocument>>;

  export function toLoader<DocumentMetadata extends Jsonifiable = Jsonifiable>(rawLoader: RawLoader, parser: Parser<DocumentMetadata> = defaultParser): Loader<DocumentMetadata> {
    return async (request: Request) => {
      const response = await rawLoader(request);
      if (response.page) {
        const documents = await Promise.all(response.page.documents.map(parser));
        return new Response(new Page(documents, response?.page?.nextPageToken), response.partitions);
      }
      return new Response<Document<DocumentMetadata>>(undefined, response.partitions);
    };
  }

  export function staticLoader<DocumentMetadata extends Jsonifiable = Jsonifiable>(documents: Document<DocumentMetadata>[], pageSize?: number): Loader<DocumentMetadata> {
    const loader = new StaticLoader(documents, pageSize);
    return (request) => loader.load(request);
  }

  class StaticLoader<DocumentMetadata extends Jsonifiable = Jsonifiable> {
    constructor(
      readonly documents: Document<DocumentMetadata>[],
      readonly pageSize?: number) {}

    async load(request: Request): Promise<Response<Document<DocumentMetadata>>> {
      if (this.pageSize) {
        const page: number = +(request.pageToken ?? 0);
        const start = page * this.pageSize;
        const end = start + this.pageSize;
        if (end > this.documents.length) {
          return new Response(new Page(this.documents.slice(start)));
        } else {
          return new Response(new Page(this.documents.slice(start, end), (page + 1).toString()));
        }
      }

      return new Response(new Page(this.documents));
    }
  }
}

/** A function that splits a document into multiple chunks, for example to ensure it fits in appropriate context windows. */
export type Chunker<DocumentMetadata extends Jsonifiable = Jsonifiable, ChunkMetadata extends Jsonifiable = Jsonifiable> = (document: Document<DocumentMetadata>) => Promise<Chunk<ChunkMetadata>[]>;

/**
 * A simple token size based text chunker. This is a good starting point for text documents.
 */
export const defaultChunker = async <Metadata extends Jsonifiable = Jsonifiable>(
  doc: Document<Metadata>) => {
  const splitter = new TokenTextSplitter({
    encodingName: 'gpt2',
    chunkSize: 600,
    chunkOverlap: 100,
  });

  const lcDocs = await splitter.createDocuments(doc.pageContent);
  const chunks = lcDocs.map((lcDoc) => ({
    content: lcDoc.pageContent,
    documentName: doc.name,
    metadata: doc.metadata,
  }) as Chunk<Metadata>);

  return chunks;
};

/** A chunk is a piece of a document that's appropriately sized for an LLM's context window and for semantic search. */
export interface Chunk<ChunkMetadata extends Jsonifiable = Jsonifiable> {
  /** The content of this chunk. This is what is provided as context to an LLM when the chunk is selected. */
  content: string;

  /** The name of the document from which this chunk was extracted. */
  documentName?: string;

  /** Optional additional metadata associated with this chunk. */
  metadata?: ChunkMetadata;
}

/**
 * An embedding is a function that maps a string to a vector encoding its semantic meaning.
 * Often this is based on the same function used to transform text for an LLM's transformers.
 */
export interface Embedding {
  embed(text: string): Promise<number[]>;
  embedBatch(chunks: string[]): Promise<number[][]>;
}

export class LangChainEmbeddingWrapper implements Embedding {
  constructor(readonly lcEmbedding: Embeddings) {}

  async embed(text: string): Promise<number[]> {
    return this.lcEmbedding.embedQuery(text);
  }

  async embedBatch(chunks: string[]): Promise<number[][]> {
    return this.lcEmbedding.embedDocuments(chunks);
  }
}

export const defaultEmbedding = new LangChainEmbeddingWrapper(new OpenAIEmbeddings());

/**
 * An embedded chunk is a piece of a document that is ready to be added into a vector space.
 */
export interface EmbeddedChunk<ChunkMetadata extends Jsonifiable = Jsonifiable> {
  /** The identifier for this chunk. For insertions, this will be generated if not populated.*/
  id?: string;

  /** The vector representing this chunk for semantic nearest neighbors. */
  vector: number[];

  /** The content of this chunk. This is what is provided as context to an LLM when the chunk is selected. */
  content: string;

  /** The name of the document from which this chunk was extracted. */
  documentName?: string;

  /** Optional additional metadata associated with this chunk. */
  metadata?: ChunkMetadata;
}

/** A chunk along with its score for a particular query. */
export interface ScoredChunk<ChunkMetadata extends Jsonifiable = Jsonifiable> {
  chunk: EmbeddedChunk<ChunkMetadata>;
  score: number;
}

export interface Corpus<ChunkMetadata extends Jsonifiable = Jsonifiable> {
  startCrawl: () => Promise<Corpus.Stats>;

  getStats: () => Promise<Corpus.Stats>;

  search: (query: string, params?: {limit?: number, score_threshold?: number}) => Promise<ScoredChunk<ChunkMetadata>[]>;
}

export namespace Corpus {
  export enum LoadingState {
    NOT_STARTED = 'NOT_STARTED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
  }

  export interface Stats {
    loadingState: LoadingState;
    completedPartitions: number;
    activePartitions: number;
    numDocuments: number;
    numChunks: number;
  }
}

export class LocalCorpus<DocumentMetadata extends Jsonifiable = Jsonifiable, ChunkMetadata extends Jsonifiable = Jsonifiable> implements Corpus<ChunkMetadata> {
  private readonly vectors: EmbeddedChunk<ChunkMetadata>[] = [];
  private readonly documents: Document<DocumentMetadata>[] = [];
  private readonly completedPartitions = new Set<string>();
  private readonly activePartitionsToToken = new Map<string|null, string|null>();
  private loadingState = Corpus.LoadingState.NOT_STARTED;
  constructor(readonly loader: CorpusLoading.Loader<DocumentMetadata>,
    readonly chunker: Chunker<DocumentMetadata, ChunkMetadata>,
    readonly embedding: Embedding = defaultEmbedding,) {
    this.loader = loader;
    this.chunker = chunker;
    this.embedding = embedding;
  }

  async startCrawl(): Promise<Corpus.Stats> {
    if (this.loadingState !== Corpus.LoadingState.NOT_STARTED) {
      return this.getStats();
    }
    this.loadingState = Corpus.LoadingState.IN_PROGRESS;
    try {
      await this.doCrawl();
      this.loadingState = Corpus.LoadingState.COMPLETED;
    } catch (e) {
      this.loadingState = Corpus.LoadingState.FAILED;
      throw e;
    }
    return this.getStats();
  }

  private async doCrawl(): Promise<void> {
    pinoLogger['info']('Starting crawl');
    this.activePartitionsToToken.set(null, null);
    while (this.activePartitionsToToken.size > 0) {
      const partition = this.activePartitionsToToken.keys().next().value;
      const token = this.activePartitionsToToken.get(partition);
      this.activePartitionsToToken.delete(partition);

      const response = await this.loader({partition, token} as CorpusLoading.Request);
      pinoLogger['info']({partitions: response.partitions?.length ?? 0, documents: response.page?.documents?.length ?? 0, nextPage: response.page?.nextPageToken != undefined}, 'Received response');
      for (let newPartition of response.partitions ?? []) {
        if (!this.completedPartitions.has(newPartition.name) && !this.activePartitionsToToken.has(newPartition.name)) {
          this.activePartitionsToToken.set(newPartition.name, newPartition.firstPageToken ?? null);
        }
      }
      if (response.page) {
        this.documents.push(...response.page.documents);
        pinoLogger['info']('Starting vectorization');
        const vectors = await this.vectorize(response.page.documents);
        pinoLogger['info']('Completed vectorization');
        this.vectors.push(...vectors.flat());
        if (response.page.nextPageToken) {
          this.activePartitionsToToken.set(partition, response.page.nextPageToken);
        } else {
          this.completedPartitions.add(partition);
        }
      }
      if (!response.page && ! response.partitions) {
        // Corner case - invalid response.
        this.completedPartitions.add(partition);
      }
    }
    pinoLogger['info']('Crawl complete');
  }

  private async vectorize(docs: Document<DocumentMetadata>[]): Promise<EmbeddedChunk<ChunkMetadata>[]> {
    pinoLogger['info']({documents: docs.length}, 'Starting chunking for documents');
    const chunks: Chunk<ChunkMetadata>[] = [];
    await Promise.all(docs.map((doc) => this.chunker(doc).then((docChunks) => chunks.push(...docChunks))));
    pinoLogger['info']({chunks: chunks.length}, 'Chunking completed. Beginning embed.');
    const vectors: number[][] = await this.embedding.embedBatch(chunks.map((chunk) => chunk.content));
    pinoLogger['info']({vectors: vectors.length}, 'Embedding completed.');
    return chunks.map((chunk, i) => ({...chunk, vector: vectors[i]} as EmbeddedChunk<ChunkMetadata>));
  }

  async getStats(): Promise<Corpus.Stats> {
    return {
      loadingState: this.loadingState,
      completedPartitions: this.completedPartitions.size,
      activePartitions: this.activePartitionsToToken.size,
      numDocuments: this.vectors.length,
      numChunks: this.vectors.length,
    } as Corpus.Stats;
  }

  async search(query: string, params?: {limit?: number, score_threshold?: number}): Promise<ScoredChunk<ChunkMetadata>[]> {
    const queryVector = await this.embedding.embed(query);
    return this.vectors.map((vector) => ({
      chunk: vector,
      score: similarity.cosine(queryVector, vector.vector),
    } as ScoredChunk<ChunkMetadata>)).sort((a, b) => b.score - a.score).slice(0, params?.limit ?? 10);
  }

}

export interface DocsQAProps<Doc extends Document> {
  /**
   * The corpus of documents that may be relevant to a query.
   */
  corpus: Corpus;

  /**
   * The query to answer.
   */
  question: string;

  /**
   * The component used to format documents when they're presented to the model.
   *
   * ```tsx
   *  function MyDocsComponent({ doc }: { doc: MyDocument }) {
   *    return <>
   *      Title: {doc.metadata.title}
   *      Content: {doc.pageContent}
   *    </>
   *  }
   * ```
   */
  docComponent: (props: { doc: Doc }) => Node;
}
/**
 * A component that can be used to answer questions about documents. This is a very common usecase for LLMs.
 */
export async function DocsQA<Doc extends Document>(props: DocsQAProps<Doc>) {
  const status = (await props.corpus.getStats()).loadingState;
  if (status !== Corpus.LoadingState.COMPLETED) {
    return "Corpus is not loaded. It's in state: " + status;
  }
  const docs = await props.corpus.search(props.question);
  return (
    <ChatCompletion>
    <SystemMessage>
    You are a customer service agent.Answer questions truthfully.Here is what you know:
  {
    docs.map((doc) => (
      // TODO improve types
      // @ts-expect-error
      <props.docComponent doc= { doc } />
        ))
  }
  </SystemMessage>
    <UserMessage> { props.question } </UserMessage>
    </ChatCompletion>
  );
}
