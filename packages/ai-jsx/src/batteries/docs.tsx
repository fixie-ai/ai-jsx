/**
 * This module provides the {@link DocsQA} component for document question and answering using an LLM.
 * See: {@link https://docs.ai-jsx.com/guides/brand-new#accessing-knowledge-docs-qa}
 * @packageDocumentation
 */

import { Embeddings } from 'langchain/embeddings/base';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { TokenTextSplitter } from 'langchain/text_splitter';
import { VectorStore } from 'langchain/vectorstores';
import _ from 'lodash';
import { similarity } from 'ml-distance';
import { Jsonifiable } from 'type-fest';
import { ChatCompletion, SystemMessage, UserMessage } from '../core/completion.js';
import { Node } from '../index.js';
import { getEnvVar } from '../lib/util.js';

/**
 * A raw document loaded from an arbitrary source that has not yet been parsed.
 */
export interface RawDocument {
  /** The raw bytes content. */
  readonly pageContent: Uint8Array;

  /**
   * A human-readable name for this document. This identifies the document to users and should
   * be unique within a corpus. If the document is hosted on the web, its URL is a good choice.
   */
  readonly name?: string;

  /** The encoding used for this document, e.g. 'utf-8'. */
  readonly encoding: string;

  /** The content type for this document, e.g. 'text/plain' */
  readonly mimeType: string;
}

/**
 * A text document that can be used to ground responses.
 */
export interface Document<DocumentMetadata extends Jsonifiable = Jsonifiable> {
  /**
   * The content of the document. While this may often be a singleton, including separate
   * meaningful pieces of text can aid in chunking/embedding.
   */
  readonly pageContent: string[];
  /**
   * A human-readable name for this document. This identifies the document to users and should
   * be unique within a corpus. If the document is hosted on the web, its URL is a good choice.
   */
  readonly name?: string;
  /**
   * Other metadata about the document, such as when it was created.
   */
  readonly metadata?: DocumentMetadata;
}

/**
 * A function that parses raw documents to produce text documents that can be used by an LLM.
 */
export type Parser<DocumentMetadata extends Jsonifiable = Jsonifiable> = (
  raw: RawDocument
) => Promise<Document<DocumentMetadata>>;

function defaultParser<DocumentMetadata extends Jsonifiable = Jsonifiable>(
  raw: RawDocument
): Promise<Document<DocumentMetadata>> {
  if (raw.mimeType.startsWith('text/')) {
    const content = new TextDecoder(raw.encoding).decode(raw.pageContent);
    return Promise.resolve({ pageContent: [content], name: raw.name });
    // TODO: Add support for other mime types.
  }
  throw new Error(`Unsupported mime type: ${raw.mimeType}`);
}

/** A non-overlapping subdivision of a corpus' documents used for loading. */
export interface CorpusPartition {
  /**
   * The unique name of this partition. Partitions are considered equivalent if their names match.
   */
  readonly name: string;

  /** An optional token for requesting the first page. */
  readonly firstPageToken?: string;
}

/** A collection of sequential documents within a single {@link CorpusPartition}. */
export interface CorpusPage<DocType extends RawDocument | Document> {
  /** Documents to load into the corpus. */
  readonly documents: DocType[];

  /** If there's another page in the requested partition, the token needed for requesting it. */
  readonly nextPageToken?: string;
}

/**
 * A request to load documents for a corpus. During loading, the corpus will issue a series of such
 * requests to the loader in order to populate itself.
 *
 * In addition to returning documents, each response may expand the corpus space in one or both of
 * two dimensions:
 * 1. Responses may include new partitions to be loaded. Partitions are non-overlapping subsets
 *    of a corpus which may be loaded in parallel. A response's new partitions will be
 *    ignored if previously included in another response.
 * 1. When a response includes a page of documents, that page may indicate that another page is
 *    available in the same partition. Pages are always loaded serially in order. The
 *    partition is completed when a response has a page with no next page token.
 *
 * Loading will always begin with a request with the default (unnamed) partition and no page token.
 * Subsequent requests depend on prior responses and will always include at least one of those
 * fields.
 *
 *  Examples:
 *  * Simple handful of documents:
 *          The response to the initial request contains only a page of documents. This could
 *          include a next page token for more documents in the single default partition if needed.
 *  * Web crawl:
 *          Each URL corresponds to a partition and the responses never include tokens. The initial
 *          response only includes partitions, one for each root URL to crawl. Each subsequent
 *          request includes the partition (the URL) and the corresponding response contains a page
 *          with a single document - the resource at that URL. If the document links to other
 *          resources that should be included in the corpus, then the response also contains those
 *          URLs as new partitions. The process repeats for all partitions until there are no known
 *          incomplete partitions (or until crawl limits are reached).
 *  * Database:
 *          Consider a database with a parent table keyed by parent_id and an interleaved child
 *          table keyed by (parent_id, child_id) whose rows correspond to corpus documents. This
 *          loader will use tokens that encode a read timestamp (for consistency) and an offset to
 *          be used in combination with a static page size.
 *
 *          Upon receiving the initial request, the loader chooses a commit timestamp to use for
 *          all reads and returns a partition for each parent_id along with a first page token
 *          indicating the chosen read timestamp and an offset of 0.
 *
 *          For each partition, the loader then receives requests with the partition (a parent_id)
 *          and a page token (the read timestamp and offest). It responds with documents
 *          corresponding to the next page size child rows within the given parent. If more
 *          children exist, the response includes a next page token with the same read timestamp
 *          and an incremented offset. This repeats until there are no more children, at which
 *          point the response has no next page token and the partition is complete.
 *
 *          Note: Including multiple parent_ids in each partition would also work and would be an
 *              effective way to limit parallelism if desired.
 */
export interface CorpusLoadRequest {
  /**
   * The partition of the corpus that should be read. This will be empty for the initial request,
   * indicating the default partition. For subsequent requests, it will typically be the name of a
   * partition returned by a previous request, though it could be empty if the default partition
   * contains multiple pages.
   */
  readonly partition?: string;

  /**
   * A token for paginating results within a corpus partition. If present, this will be echoed from
   * a previous response.
   */
  readonly pageToken?: string;
}

/** The response to a {@link CorpusLoadRequest}. */
export interface CorpusLoadResponse<DocType extends RawDocument | Document> {
  /** A page of documents from the requested partition. */
  readonly page?: CorpusPage<DocType>;

  /**
   * Additional partitions that should be loaded in subsequent requests. These will be ignored if
   * they were already included in a previous response.
   */
  readonly partitions?: CorpusPartition[];
}

/** A function responsible for loading and parsing a corpus. */
export type Loader<DocumentMetadata extends Jsonifiable = Jsonifiable> = (
  request: CorpusLoadRequest
) => Promise<CorpusLoadResponse<Document<DocumentMetadata>>>;

/** A function responsible for loading a corpus when parsing is handled separately. */
export type RawLoader = (request: CorpusLoadRequest) => Promise<CorpusLoadResponse<RawDocument>>;

/** Combines a {@link RawLoader} with a {@link Parser} to produce a {@link Loader}. */
export function toLoader<DocumentMetadata extends Jsonifiable = Jsonifiable>(
  rawLoader: RawLoader,
  parser: Parser<DocumentMetadata> = defaultParser
): Loader<DocumentMetadata> {
  return async (request: CorpusLoadRequest) => {
    const response = await rawLoader(request);
    if (response.page) {
      const documents = await Promise.all(response.page.documents.map(parser));
      return {
        page: {
          documents,
          nextPageToken: response.page.nextPageToken,
        },
        partitions: response.partitions,
      } as CorpusLoadResponse<Document<DocumentMetadata>>;
    }
    return {
      partitions: response.partitions,
    } as CorpusLoadResponse<Document<DocumentMetadata>>;
  };
}

class StaticLoader<DocumentMetadata extends Jsonifiable = Jsonifiable> {
  constructor(readonly documents: Document<DocumentMetadata>[], readonly pageSize?: number) {}

  /* eslint-disable require-await */
  async load(request: CorpusLoadRequest): Promise<CorpusLoadResponse<Document<DocumentMetadata>>> {
    if (this.pageSize) {
      const page: number = Number(request.pageToken ?? 0);
      const start = page * this.pageSize;
      const end = start + this.pageSize;
      if (end > this.documents.length) {
        return {
          page: {
            documents: this.documents.slice(start),
          },
        } as CorpusLoadResponse<Document<DocumentMetadata>>;
      }
      return {
        page: {
          documents: this.documents.slice(start, end),
          nextPageToken: (page + 1).toString(),
        },
      } as CorpusLoadResponse<Document<DocumentMetadata>>;
    }

    return {
      page: {
        documents: this.documents,
      },
    } as CorpusLoadResponse<Document<DocumentMetadata>>;
  }
  /* eslint-enable */
}

/** A {@link Loader} that provides a static set of in-memory documents, optionally with pagination. */
export function staticLoader<DocumentMetadata extends Jsonifiable = Jsonifiable>(
  documents: Document<DocumentMetadata>[],
  pageSize?: number
): Loader<DocumentMetadata> {
  const loader = new StaticLoader(documents, pageSize);
  return (request) => loader.load(request);
}

/**
 * A function that splits a document into multiple chunks, for example to ensure it fits in
 * appropriate context windows.
 */
export type Chunker<
  DocumentMetadata extends Jsonifiable = Jsonifiable,
  ChunkMetadata extends Jsonifiable = Jsonifiable
> = (document: Document<DocumentMetadata>) => Promise<Chunk<ChunkMetadata>[]>;

/** Creates a {@link Chunker} with the given parameters. */
export function makeChunker<Metadata extends Jsonifiable = Jsonifiable>(
  chunkSize: number,
  chunkOverlap: number
): Chunker<Metadata, Metadata> {
  return async (doc: Document<Metadata>) => {
    const splitter = new TokenTextSplitter({
      encodingName: 'gpt2',
      chunkSize,
      chunkOverlap,
    });
    const lcDocs = await splitter.createDocuments(doc.pageContent);
    const chunks = lcDocs.map(
      (lcDoc) =>
        ({
          content: lcDoc.pageContent,
          documentName: doc.name,
          metadata: doc.metadata,
        } as Chunk<Metadata>)
    );
    return chunks;
  };
}

/** A simple token size based text chunker. This is a good starting point for text documents. */
export const defaultChunker = makeChunker(600, 100);

/**
 * A piece of a document that's appropriately sized for an LLM's
 * [context window]{@link https://docs.ai-jsx.com/guides/brand-new#context-window} and for semantic
 * search.
 */
export interface Chunk<ChunkMetadata extends Jsonifiable = Jsonifiable> {
  /**
   * The content of this chunk. This is what is provided as context to an LLM when the chunk is
   * selected.
   */
  readonly content: string;

  /** The name of the document from which this chunk was extracted. */
  readonly documentName?: string;

  /** Optional additional metadata associated with this chunk. */
  readonly metadata?: ChunkMetadata;
}

/**
 * A function that maps strings to vectors encoding their semantic meaning. Often this is based on
 * the same function used to transform text for an LLM's transformers, though this isn't required.
 * Alse see {@link https://docs.ai-jsx.com/guides/brand-new#semantic-similarity-embeddings}.
 */
export interface Embedding {
  embed(text: string): Promise<number[]>;
  embedBatch(chunks: string[]): Promise<number[][]>;
}

/** An {@link Embedding} implementation that defers to a LangChain `Embeddings` object. */
export class LangChainEmbeddingWrapper implements Embedding {
  constructor(readonly lcEmbedding: Embeddings) {}

  embed(text: string): Promise<number[]> {
    return this.lcEmbedding.embedQuery(text);
  }

  embedBatch(chunks: string[]): Promise<number[][]> {
    return this.lcEmbedding.embedDocuments(chunks);
  }
}

/** A default embedding useful for DocsQA. Note that this requires `OPENAI_API_KEY` to be set. */
function defaultEmbedding() {
  const apiKey = getEnvVar('OPENAI_API_KEY');
  return new LangChainEmbeddingWrapper(new OpenAIEmbeddings({ openAIApiKey: apiKey }));
}

/**
 * A function that converts documents into {@link EmbeddedChunk}s.
 *
 * @see asVectorizer
 */
export type Vectorizer<
  DocumentMetadata extends Jsonifiable = Jsonifiable,
  ChunkMetadata extends Jsonifiable = Jsonifiable
> = (documents: Document<DocumentMetadata>[]) => Promise<EmbeddedChunk<ChunkMetadata>[]>;

/** Converts a {@link Chunker} + {@link Embedding} into a unified {@link Vectorizer} function. */
export function asVectorizer<
  DocumentMetadata extends Jsonifiable = Jsonifiable,
  ChunkMetadata extends Jsonifiable = Jsonifiable
>(chunker: Chunker<DocumentMetadata, ChunkMetadata>, embedding: Embedding) {
  return async (docs: Document<DocumentMetadata>[]) => {
    const chunks = _.flatten(await Promise.all(docs.map((doc) => chunker(doc))));
    const vectors: number[][] = await embedding.embedBatch(chunks.map((chunk) => chunk.content));
    return chunks.map((chunk, i) => ({ ...chunk, vector: vectors[i] } as EmbeddedChunk<ChunkMetadata>));
  };
}

/** A piece of a document that is ready to be added into a vector space. */
export interface EmbeddedChunk<ChunkMetadata extends Jsonifiable = Jsonifiable> {
  /**
   * The identifier for this chunk. When adding this object to a vector database, this field will
   * be generated if not populated.
   */
  id?: string;

  /** The vector representing this chunk for semantic nearest neighbors. */
  vector: number[];

  /**
   * The content of this chunk. This is what is provided as context to an LLM when the chunk is
   * selected.
   */
  content: string;

  /** The name of the document from which this chunk was extracted. */
  documentName?: string;

  /** Optional additional metadata associated with this chunk. */
  metadata?: ChunkMetadata;
}

/** A chunk along with its score for a particular query. */
export interface ScoredChunk<ChunkMetadata extends Jsonifiable = Jsonifiable> {
  /** The Chunk result. */
  chunk: Chunk<ChunkMetadata>;
  /** The Chunk's raw score for the given query. */
  score: number;

  /** The id of the vector encoding this chunk (if supported). */
  id?: string;
}

/**
 * A corpus is a collection of documents that can be provided to an LLM to provide grounding for
 * responses.
 */
export interface Corpus<ChunkMetadata extends Jsonifiable = Jsonifiable> {
  /** Finds document chunks that are semantically similar to the provided query. */
  search: (
    query: string,
    params?: { limit?: number; score_threshold?: number }
  ) => Promise<ScoredChunk<ChunkMetadata>[]>;
}

/** An indication of what steps are necessary to make this corpus ready for serving. */
export enum CorpusLoadingState {
  /** Documents have not been loaded. Call `startLoading` to begin loading them. */
  NOT_STARTED = 'NOT_STARTED',
  /** Documents are currently being loaded. */
  IN_PROGRESS = 'IN_PROGRESS',
  /** Documents were successfully loaded. The corpus is ready for serving. */
  COMPLETED = 'COMPLETED',
  /** Documents failed to load. See details for your implementation to try to resolve. */
  FAILED = 'FAILED',
}

/** Statistics about a corpus, including its LoadingState. */
export interface CorpusStats {
  loadingState: CorpusLoadingState;
  completedPartitions: number;
  activePartitions: number;
  numDocuments: number;
  numChunks: number;
  /** If loadingState == FAILED, the error that caused it. */
  loadingError?: Error;
}

class CorpusNotReadyError extends Error {
  constructor(state: CorpusLoadingState) {
    super(`Corpus is not ready. It's in state ${state}. Call load() to load documents.`);
  }
}

/**
 * A LoadableCorpus is a {@link Corpus} that can additionally load and index documents.
 */
export interface LoadableCorpus<ChunkMetadata extends Jsonifiable = Jsonifiable> extends Corpus<ChunkMetadata> {
  load: () => Promise<CorpusStats>;

  getStats: () => CorpusStats;
}

abstract class BaseLoadableCorpus<
  DocumentMetadata extends Jsonifiable = Jsonifiable,
  ChunkMetadata extends Jsonifiable = Jsonifiable
> implements LoadableCorpus<ChunkMetadata>
{
  private stats: CorpusStats = {
    loadingState: CorpusLoadingState.NOT_STARTED,
    completedPartitions: 0,
    activePartitions: 0,
    numDocuments: 0,
    numChunks: 0,
  };
  private loadingPromise: Promise<CorpusStats> | null = null;
  constructor(
    readonly loader: Loader<DocumentMetadata>,
    readonly vectorizer: Vectorizer<DocumentMetadata, ChunkMetadata>,
    readonly chunkConsumer: (chunks: EmbeddedChunk<ChunkMetadata>[]) => Promise<void>
  ) {}

  /**
   * Loads documents into the corpus using a {@link Loader}, {@link Chunker}, and
   * {@link Embedding}. If the returned promise resolves succesfully, the corpus will be in
   * COMPLETED state. If it rejects, the corpus may be in FAILED state.
   *
   * Note: Corpus loading may be quite time consuming. It's best to ensure loading is done prior
   * to exposing this corpus to your users.
   *
   * Note: This method is idempotent. Calling it multiple times will not result in multiple loads.
   */
  async load(): Promise<CorpusStats> {
    if (!this.loadingPromise) {
      this.stats.loadingState = CorpusLoadingState.IN_PROGRESS;
      this.loadingPromise = loadCorpus(this.loader, this.vectorizer, this.chunkConsumer);
    }
    try {
      this.stats = await this.loadingPromise;
    } catch (e) {
      this.stats.loadingState = CorpusLoadingState.FAILED;
      if (e instanceof Error) {
        this.stats.loadingError = e;
      }
      throw e;
    }
    return this.stats;
  }

  /** Reveals statistics about this corpus, including its LoadingState. */
  getStats(): CorpusStats {
    return this.stats;
  }

  protected checkReady(): void {
    if (this.stats.loadingState !== CorpusLoadingState.COMPLETED) {
      throw new CorpusNotReadyError(this.stats.loadingState);
    }
  }

  abstract search(
    query: string,
    params?: { limit?: number; score_threshold?: number }
  ): Promise<ScoredChunk<ChunkMetadata>[]>;
}

async function loadCorpus<
  DocumentMetadata extends Jsonifiable = Jsonifiable,
  ChunkMetadata extends Jsonifiable = Jsonifiable
>(
  loader: Loader<DocumentMetadata>,
  vectorize: Vectorizer<DocumentMetadata, ChunkMetadata>,
  chunkConsumer: (chunks: EmbeddedChunk<ChunkMetadata>[]) => Promise<void>,
  maxRequests: number = 5000
): Promise<CorpusStats> {
  const activePartitionsToToken = new Map<CorpusPartition['name'] | null, string | null>();
  const completedPartitions = new Set<CorpusPartition['name']>();
  let numDocuments = 0;
  let numChunks = 0;
  let numRequests = 0;

  activePartitionsToToken.set(null, null);
  while (activePartitionsToToken.size > 0 && numRequests++ < maxRequests) {
    const [partition, pageToken] = activePartitionsToToken.entries().next().value;
    activePartitionsToToken.delete(partition);

    const response = await loader({ partition, pageToken } as CorpusLoadRequest);
    if (!response.page && !response.partitions) {
      throw Error(
        `Loader responses must include a page, new partitions, or both. However, the loader returned ${JSON.stringify(
          response
        )}. Update your loader to return the right type.`
      );
    }
    for (const newPartition of response.partitions ?? []) {
      if (!completedPartitions.has(newPartition.name) && !activePartitionsToToken.has(newPartition.name)) {
        activePartitionsToToken.set(newPartition.name, newPartition.firstPageToken ?? null);
      }
    }
    if (response.page) {
      numDocuments += response.page.documents.length;
      const vectors = await vectorize(response.page.documents);
      numChunks += vectors.length;
      await chunkConsumer(vectors);
      if (response.page.nextPageToken) {
        activePartitionsToToken.set(partition, response.page.nextPageToken);
      } else {
        completedPartitions.add(partition);
      }
    }
  }

  return {
    loadingState: CorpusLoadingState.COMPLETED,
    completedPartitions: completedPartitions.size,
    activePartitions: activePartitionsToToken.size,
    numDocuments,
    numChunks,
  };
}

/**
 * A {@link LoadableCorpus} implementation that runs locally and stores chunks in memory.
 *
 * This implementation doesn't make external requests except through the provided Loader, Chunker,
 * and Embedding (but note that the default Embedding does make external requests).
 */
export class LocalCorpus<
  DocumentMetadata extends Jsonifiable = Jsonifiable,
  ChunkMetadata extends Jsonifiable = Jsonifiable
> extends BaseLoadableCorpus<DocumentMetadata, ChunkMetadata> {
  private readonly vectors: EmbeddedChunk<ChunkMetadata>[] = [];
  constructor(
    readonly loader: Loader<DocumentMetadata>,
    readonly chunker: Chunker<DocumentMetadata, ChunkMetadata>,
    readonly embedding: Embedding = defaultEmbedding()
  ) {
    const chunkConsumer = (chunks: EmbeddedChunk<ChunkMetadata>[]) => {
      this.vectors.push(...chunks);
      return Promise.resolve();
    };
    super(loader, asVectorizer(chunker, embedding), chunkConsumer);
  }

  async search(
    query: string,
    params?: { limit?: number; score_threshold?: number }
  ): Promise<ScoredChunk<ChunkMetadata>[]> {
    this.checkReady();
    const queryVector = await this.embedding.embed(query);
    return this.vectors
      .map(
        (vector) =>
          ({
            chunk: {
              content: vector.content,
              metadata: vector.metadata,
              documentName: vector.documentName,
            },
            score: similarity.cosine(queryVector, vector.vector),
            id: vector.id,
          } as ScoredChunk<ChunkMetadata>)
      )
      .filter((chunk) => chunk.score >= (params?.score_threshold ?? Number.MIN_VALUE))
      .sort((a, b) => b.score - a.score)
      .slice(0, params?.limit ?? 10);
  }
}

/** A fully mananged {@link Corpus} served by Fixie. */
export class FixieCorpus<ChunkMetadata extends Jsonifiable = Jsonifiable> implements Corpus<ChunkMetadata> {
  private static readonly FIXIE_API_URL = 'https://app.fixie.ai/api';

  constructor(private readonly corpus_id: string, private readonly fixie_api_key?: string) {
    if (!fixie_api_key) {
      this.fixie_api_key = getEnvVar('FIXIE_API_KEY');
      if (!this.fixie_api_key) {
        throw new Error(
          'You must provide a Fixie API key to access Fixie corpora. Find yours at https://app.fixie.ai/profile'
        );
      }
    }
  }

  async search(query: string, params?: { limit?: number }): Promise<ScoredChunk<ChunkMetadata>[]> {
    const response = await fetch(`${FixieCorpus.FIXIE_API_URL}/corpora/${this.corpus_id}:query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.fixie_api_key}`,
      },
      body: JSON.stringify({ query_string: query, chunk_limit: params?.limit }),
    });
    if (response.status !== 200) {
      throw new Error(`Fixie API returned status ${response.status}: ${await response.text()}`);
    }
    const api_results = await response.json();
    return api_results.chunks.map((result: any) => ({
      chunk: {
        content: result.content,
        metadata: result.metadata,
        documentName: result.document_name,
      },
      score: result.score,
    }));
  }
}

/** A {@link Corpus} backed by a LangChain {@link VectorStore}. */
export class LangchainCorpus<ChunkMetadata extends Jsonifiable & Record<string, any> = Record<string, any>>
  implements Corpus<ChunkMetadata>
{
  constructor(readonly vectorStore: VectorStore) {}

  search(query: string, params?: { limit?: number; score_threshold?: number }): Promise<ScoredChunk<ChunkMetadata>[]> {
    return searchVectorStore(this.vectorStore, query, params);
  }
}

/** A {@link LoadableCorpus} backed by a LangChain {@link VectorStore}. */
export class LoadableLangchainCorpus<
  DocumentMetadata extends Jsonifiable = Jsonifiable,
  ChunkMetadata extends Jsonifiable & Record<string, any> = Record<string, any>
> extends BaseLoadableCorpus<DocumentMetadata, ChunkMetadata> {
  constructor(
    readonly vectorstore: VectorStore,
    readonly loader: Loader<DocumentMetadata>,
    readonly chunker: Chunker<DocumentMetadata, ChunkMetadata>
  ) {
    const embedding = new LangChainEmbeddingWrapper(vectorstore.embeddings);
    const chunkConsumer = async (chunks: EmbeddedChunk<ChunkMetadata>[]) => {
      const vectors = chunks.map((chunk) => chunk.vector);
      const lcDocs = chunks.map((chunk) => ({
        pageContent: chunk.content,
        metadata: chunk.metadata ?? {},
      }));
      await this.vectorstore.addVectors(vectors, lcDocs);
    };
    super(loader, asVectorizer(chunker, embedding), chunkConsumer);
  }

  search(query: string, params?: { limit?: number; score_threshold?: number }): Promise<ScoredChunk<ChunkMetadata>[]> {
    this.checkReady();
    return searchVectorStore(this.vectorstore, query, params);
  }
}

const defaultLangchainChunkLimit = 4;

async function searchVectorStore<ChunkMetadata extends Jsonifiable = Jsonifiable>(
  vectorStore: VectorStore,
  query: string,
  params?: { limit?: number; score_threshold?: number }
): Promise<ScoredChunk<ChunkMetadata>[]> {
  const scoredLcDocs = await vectorStore.similaritySearchWithScore(
    query,
    params?.limit ?? defaultLangchainChunkLimit,
    params
  );
  return scoredLcDocs.map((lcDocAndScore) => {
    const lcDoc = lcDocAndScore[0];
    return {
      score: lcDocAndScore[1],
      chunk: {
        // TODO: Wrap chunker to track document name in ChunkMetadata in a way we can pull back out here.
        content: lcDoc.pageContent,
        metadata: lcDoc.metadata as ChunkMetadata,
      },
    } as ScoredChunk<ChunkMetadata>;
  });
}

/** A default component for formatting document chunks. */
export const DefaultFormatter = ({ doc }: { doc: ScoredChunk }) => (
  <>
    Title: {doc.chunk.documentName ?? 'Untitled'}
    Content: {doc.chunk.content}
  </>
);

/** Properties to be passed to the {@link DocsQA} component. */
export interface DocsQAProps<ChunkMetadata extends Jsonifiable = Jsonifiable> {
  /**
   * The corpus of documents that may be relevant to a query.
   */
  corpus: Corpus<ChunkMetadata>;

  /**
   * The question to answer.
   */
  question: string;

  /**
   *
   * When processing a DocsQA query, the most relevent chunks are presented to the model. This
   * field limits the number of chunks to consider. If this value is too large, the size
   * of the chunks may exceed the token limit of the model.
   */
  chunkLimit?: number;

  /**
   * The component used to format document chunks when they're presented to the model.
   * This can be used to present the model with some metadata about the chunk, in a format
   * that is appropriate to the type of document.
   *
   * ```tsx
   *  function FormatChunk({ chunk }: { chunk: ScoredChunk }) {
   *    return <>
   *      Title: {chunk.chunk.documentName}
   *      Content: {chunk.chunk.content}
   *    </>
   *  }
   * ```
   */
  chunkFormatter?: (props: { doc: ScoredChunk<ChunkMetadata> }) => Node;
}

/**
 * A component that can be used to answer questions about documents. This is a very common usecase for LLMs.
 * @example
 * ```tsx
 *   <DocsQA question="What was Hurricane Katrina?" corpus={corpus} chunkLimit={5} chunkFormatter={GetChunk} />
 * ```
 */
export async function DocsQA<ChunkMetadata extends Jsonifiable = Jsonifiable>(props: DocsQAProps<ChunkMetadata>) {
  const chunks = await props.corpus.search(props.question, { limit: props.chunkLimit });
  const chunkFormatter: (props: { doc: ScoredChunk<ChunkMetadata> }) => Node = props.chunkFormatter ?? DefaultFormatter;

  return (
    <ChatCompletion>
      <SystemMessage>
        You are a trained question answerer. Answer questions truthfully, using only the document excerpts below. Do not
        use any other knowledge you have about the world. If you don't know how to answer the question, just say "I
        don't know." Here are the relevant document excerpts you have been given:
        {chunks.map((chunk) => chunkFormatter({ doc: chunk }))}
        And here is the question you must answer:
      </SystemMessage>
      <UserMessage>{props.question}</UserMessage>
    </ChatCompletion>
  );
}
