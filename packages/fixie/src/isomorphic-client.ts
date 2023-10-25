import type { Jsonifiable } from 'type-fest';
import {
  AgentId,
  AssistantConversationTurn,
  Conversation,
  ConversationId,
  MessageRequestParams,
} from './sidekick-types.js';

export interface UserInfo {
  id: number;
  username: string;
  is_authenticated: boolean;
  is_superuser: boolean;
  is_staff: boolean;
  is_active: boolean;
  is_anonymous: boolean;
  email?: string;
  first_name?: string;
  last_name?: string;
  last_login?: Date;
  date_joined?: Date;
  api_token?: string;
  avatar?: string;
  organization?: string;
}

export class AgentDoesNotExistError extends Error {
  code = 'agent-does-not-exist';
}

/**
 * Represents an error that occurs when the Fixie client encounters an error contacting
 * the API endxpoint.
 */
export class FixieClientError extends Error {
  url: URL;
  statusCode: number;
  statusText: string;
  detail: unknown;

  constructor(url: URL, statusCode: number, statusText: string, message?: string, detail: unknown = {}) {
    super(message);
    this.url = url;
    this.statusCode = statusCode;
    this.statusText = statusText;
    this.name = 'FixieClientError';
    this.detail = detail;
  }
}

const debug =
  typeof process !== 'undefined' &&
  // Don't make any assumptions about the environment.
  /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
  process.env?.FIXIE_DEBUG === 'true';

/**
 * A client to the Fixie AI platform.
 *
 * This client can be used on the web or in NodeJS
 */
export class IsomorphicFixieClient {
  /**
   * Use the `Create*` methods instead.
   */
  protected constructor(
    public readonly url: string,
    public readonly apiKey?: string,
  ) {}

  static Create(url: string, apiKey?: string) {
    const apiKeyToUse = apiKey ?? process.env.FIXIE_API_KEY;
    if (!apiKeyToUse) {
      throw new Error(
        'You must pass apiKey to the constructor, or set the FIXIE_API_KEY environment variable. The API key can be found at: https://console.fixie.ai/profile',
      );
    }
    return new this(url, apiKey);
  }

  /**
   * Create a new FixieClient without an API key. This is only useful for accessing public APIs, such as the conversation APIs.
   *
   * You only need to pass url if you're pointing to a different Fixie backend than the default production. Unless you specificially know you need to do this, you don't.
   */
  // This is also useful for running in the console.fixie.ai webapp, because it's on the same host
  // as the backend and thus doesn't need the API key, assuming we set the auth cookies to be cross-domain.
  static CreateWithoutApiKey(url?: string) {
    return new this(url ?? 'https://api.fixie.ai');
  }

  /** Send a request to the Fixie API with the appropriate auth headers. */
  async request(path: string, bodyData?: unknown, method?: string, options: RequestInit = {}) {
    const fetchMethod = method ?? (bodyData ? 'POST' : 'GET');

    const headers: RequestInit['headers'] = {};
    if (bodyData) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    const url = new URL(path, this.url);
    if (debug) {
      console.log(`[Fixie request] ${url}`, bodyData);
    }
    const res = await fetch(url, {
      ...options,
      method: fetchMethod,
      headers,
      // This is needed so serverside NextJS doesn't cache POSTs.
      cache: 'no-store',
      // eslint-disable-next-line
      body: bodyData ? JSON.stringify(bodyData) : undefined,
    }).catch((err) => {
      throw new FixieClientError(url, 0, 'Network error', `Network error accessing ${url}`, err);
    });
    if (!res.ok) {
      throw new FixieClientError(
        url,
        res.status,
        res.statusText,
        `Error accessing Fixie API: ${url}`,
        await res.text(),
      );
    }
    return res;
  }

  async requestJson<T = Jsonifiable>(path: string, bodyData?: unknown, method?: string): Promise<T> {
    const response = await this.request(path, bodyData, method);
    return response.json();
  }

  async requestJsonLines<T = Jsonifiable>(
    path: string,
    bodyData?: unknown,
    method?: string,
  ): Promise<ReadableStream<T>> {
    const response = await this.request(path, bodyData, method);
    if (response.body === null) {
      throw new FixieClientError(
        new URL(path, this.url),
        response.status,
        response.statusText,
        'Response body was null',
      );
    }

    let buffer = '';
    return response.body.pipeThrough(new TextDecoderStream()).pipeThrough(
      new TransformStream<string, T>({
        flush(controller) {
          if (buffer.trim()) {
            controller.enqueue(JSON.parse(buffer));
            buffer = '';
          }
        },
        transform(chunk, controller) {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop()!;
          for (const line of lines) {
            if (line.trim()) {
              controller.enqueue(JSON.parse(line));
            }
          }
        },
      }),
    );
  }

  /** Return information on the currently logged-in user. */
  userInfo(): Promise<UserInfo> {
    const rawUserInfo: unknown = this.requestJson('/api/user');
    return rawUserInfo as Promise<UserInfo>;
  }

  /** List Corpora visible to this user.
   * @param ownerType
   *   OWNER_USER: Only list corpora owned by the current user.
   *   OWNER_ORG: Only list corpora owned by the current user's organization.
   *   OWNER_PUBLIC: Only list public corpora.
   *   OWNER_ALL: List all corpora visible to the current user.
   */
  listCorpora(
    ownerType?: 'OWNER_USER' | 'OWNER_ORG' | 'OWNER_PUBLIC' | 'OWNER_ALL',
    offset: number = 0,
    limit: number = 100,
  ): Promise<Jsonifiable> {
    if (ownerType !== undefined) {
      return this.requestJson(`/api/v1/corpora?owner_type=${ownerType}&offset=${offset}&limit=${limit}`);
    }
    return this.requestJson('/api/v1/corpora?offset=${offset}&limit=${limit}');
  }

  /** Get information about a given Corpus. */
  getCorpus(corpusId: string): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/corpora/${corpusId}`);
  }

  /** Create a new Corpus. */
  createCorpus(name?: string, description?: string): Promise<Jsonifiable> {
    const body = {
      corpus: {
        display_name: name,
        description,
      },
    };
    return this.requestJson('/api/v1/corpora', body);
  }

  /** Query a given Corpus. */
  queryCorpus(corpusId: string, query: string, maxChunks?: number): Promise<Jsonifiable> {
    const body = {
      corpus_id: corpusId,
      query,
      max_chunks: maxChunks,
    };
    return this.requestJson(`/api/v1/corpora/${corpusId}:query`, body);
  }

  /** List the Sources in a given Corpus. */
  listCorpusSources(corpusId: string, offset: number = 0, limit: number = 100): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources&offset=${offset}&limit=${limit}`);
  }

  /** Get information about a given Source. */
  getCorpusSource(corpusId: string, sourceId: string): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}`);
  }

  /** Add a new Source to a Corpus. */
  addCorpusSource(
    corpusId: string,
    startUrls: string[],
    includeGlobs?: string[],
    excludeGlobs?: string[],
    maxDocuments?: number,
    maxDepth?: number,
    description?: string,
    displayName?: string,
  ): Promise<Jsonifiable> {
    /**
     * Mike says Apify won't like the querystring and fragment, so we'll remove them.
     */
    const sanitizedStartUrls = startUrls.map((url) => {
      // Delete the query and fragment from the URL.
      const urlObj = new URL(url);
      urlObj.search = '';
      urlObj.hash = '';
      return urlObj.toString();
    });

    const body = {
      corpus_id: corpusId,
      source: {
        displayName,
        description,
        corpus_id: corpusId,
        load_spec: {
          max_documents: maxDocuments,
          web: {
            start_urls: sanitizedStartUrls,
            max_depth: maxDepth,
            include_glob_patterns: includeGlobs,
            exclude_glob_patterns: excludeGlobs,
          },
        },
      },
    };
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources`, body);
  }

  /**
   * Delete a given Source.
   *
   * The source must have no running jobs and no remaining documents. Use clearCorpusSource() to remove all documents.
   */
  deleteCorpusSource(corpusId: string, sourceId: string): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}`, undefined, 'DELETE');
  }

  /**
   * Refresh the given Source.
   *
   * If a job is already running on this source, and force = false, this call will return an error.
   * If a job is already running on this source, and force = true, that job will be killed and restarted.
   */
  refreshCorpusSource(corpusId: string, sourceId: string, force?: boolean): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}:refresh`, { force });
  }

  /**
   * Clear the given Source, removing all its documents and their chunks.
   *
   * If a job is already running on this source, and force = false, this call will return an error.
   * If a job is already running on this source, and force = true, that job will be killed and restarted.
   */
  clearCorpusSource(corpusId: string, sourceId: string, force?: boolean): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}:clear`, { force });
  }

  /** List Jobs associated with a given Source. */
  listCorpusSourceJobs(
    corpusId: string,
    sourceId: string,
    offset: number = 0,
    limit: number = 100,
  ): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}/jobs?offset=${offset}&limit=${limit}`);
  }

  /** Get information about a given Job. */
  getCorpusSourceJob(corpusId: string, sourceId: string, jobId: string): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}/jobs/${jobId}`);
  }

  /** List Documents in a given Corpus Source. */
  listCorpusSourceDocs(
    corpusId: string,
    sourceId: string,
    offset: number = 0,
    limit: number = 100,
  ): Promise<Jsonifiable> {
    return this.requestJson(
      `/api/v1/corpora/${corpusId}/sources/${sourceId}/documents?offset=${offset}&limit=${limit}`,
    );
  }

  /** Get information about a given Document. */
  getCorpusSourceDoc(corpusId: string, sourceId: string, docId: string): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}/documents/${docId}`);
  }

  /**
   * Start a new conversation with an agent, optionally sending the initial message. (If you don't send the initial
   * message, the agent may.)
   *
   * @returns {Promise<ReadableStream<Conversation>>} A stream of Conversation objects. Each member of the stream is
   * the latest value of the conversation as the agent streams its response. So, if you're driving a UI with thisresponse,
   * you always want to render the most recently emitted value from the stream.
   *
   * @see sendMessage
   * @see stopGeneration
   * @see regenerate
   */
  startConversation(agentId: AgentId, message?: string) {
    return this.requestJsonLines<Conversation>(
      `/api/v1/agents/${agentId}/conversations`,
      message ? { message } : undefined,
      'POST',
    );
  }

  /**
   * Get a conversation by ID.
   *
   * @returns {Promise<Conversation>} The conversation.
   */
  getConversation(agentId: AgentId, conversationId: ConversationId) {
    return this.requestJson<Conversation>(`/api/v1/agents/${agentId}/conversations/${conversationId}`);
  }

  /**
   *
   * Send a message to a conversation. If the conversationId does not refer to a conversation that already exists,
   * this will throw an error.
   *
   * @returns {Promise<ReadableStream<AssistantConversationTurn>>} A stream of ConversationTurn objects. Each member of the
   * stream is the latest value of the turn as the agent streams its response. So, if you're driving a UI with this
   * response, you always want to render the most recently emitted value from the stream.
   *
   * @see startConversation
   */
  sendMessage(agentId: AgentId, conversationId: ConversationId, message: MessageRequestParams) {
    return this.requestJsonLines<AssistantConversationTurn>(
      `/api/v1/agents/${agentId}/conversations/${conversationId}/messages`,
      message,
      'POST',
    );
  }

  /**
   * Stop a message that is currently being generated.
   */
  stopGeneration(agentId: AgentId, conversationId: ConversationId, messageId: string) {
    return this.request(
      `/api/v1/agents/${agentId}/conversations/${conversationId}/messages/${messageId}/stop`,
      undefined,
      'POST',
    );
  }

  /**
   * Regenerate a message that has already been generated. If `messageId` is not the most recent message in the
   * conversation, this request will fail.
   *
   * @returns {Promise<ReadableStream<AssistantConversationTurn>>} A stream of ConversationTurn objects. Each member of the
   * stream is the latest value of the turn as the agent streams its response. So, if you're driving a UI with this
   * response, you always want to render the most recently emitted value from the stream.
   *
   * @see stopGeneration
   */
  regenerate(agentId: AgentId, conversationId: ConversationId, messageId: string) {
    return this.requestJsonLines<AssistantConversationTurn>(
      `/api/v1/agents/${agentId}/conversations/${conversationId}/messages/${messageId}/regenerate`,
      undefined,
      'POST',
    );
  }
}
