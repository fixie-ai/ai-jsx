import { ApolloClient } from '@apollo/client/core/ApolloClient.js';
import { InMemoryCache } from '@apollo/client/cache/inmemory/inMemoryCache.js';
import createUploadLink from 'apollo-upload-client/public/createUploadLink.js';
import type { Jsonifiable } from 'type-fest';
import {
  AgentId,
  AssistantConversationTurn,
  Conversation,
  ConversationId,
  Metadata,
  User,
  Team,
  Membership,
  MembershipRole,
} from './types.js';
import { encode } from 'base64-arraybuffer';

export class AgentDoesNotExistError extends Error {
  code = 'agent-does-not-exist';
}

/**
 * Represents an error that occurs when the Fixie client encounters an error contacting
 * the API endpoint.
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

/**
 * A client to the Fixie AI platform.
 *
 * This client can be used on the web or in NodeJS.
 */
export class FixieClient {
  /**
   * The API key to use for requests.
   */
  public readonly apiKey?: string;

  /**
   * The URL of the Fixie API to use for requests.
   */
  public readonly url: string;

  /**
   * Additional headers to send with requests.
   */
  public readonly headers: Record<string, string>;

  /**
   * Initializes a FixieClient.
   *
   * @param options The options to use for the client.
   * @param options.apiKey The API key to use for requests. Required for authenticated requests.
   * @param options.url The URL of the Fixie API to use for requests. Defaults to https://api.fixie.ai if not specified.
   * @param options.headers Additional headers to send with requests.
   */
  public constructor({ url, apiKey, headers }: { apiKey?: string; url?: string; headers?: Record<string, string> }) {
    this.apiKey = apiKey;
    this.url = url ?? 'https://api.fixie.ai';
    this.headers = headers ?? {};
  }

  public gqlClient(): ApolloClient<any> {
    // For GraphQL operations, we use an ApolloClient with the apollo-upload-client
    // extension to allow for file uploads.
    return new ApolloClient({
      cache: new InMemoryCache(),
      // We're using the apollo-upload-client extension to allow for file uploads.
      link: createUploadLink({
        uri: `${this.url}/graphql`,
        headers: {
          ...this.headers,
          ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        },
      }),
    });
  }

  /** Send a request to the Fixie API with the appropriate auth headers. */
  async request(path: string, bodyData?: unknown, method?: string, options: RequestInit = {}) {
    const fetchMethod = method ?? (bodyData ? 'POST' : 'GET');

    const headers: RequestInit['headers'] = {
      ...this.headers,
    };
    if (bodyData) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    const url = new URL(path, this.url);
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
        await res.text()
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
    method?: string
  ): Promise<ReadableStream<T>> {
    const response = await this.request(path, bodyData, method);
    if (response.body === null) {
      throw new FixieClientError(
        new URL(path, this.url),
        response.status,
        response.statusText,
        'Response body was null'
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
      })
    );
  }

  /** Return information on the currently logged-in user. */
  async userInfo(): Promise<User> {
    const rawUserInfo: { user: User } = await this.requestJson('/api/v1/users/me');
    return rawUserInfo.user;
  }

  /**
   * Update the current user's metadata.
   *
   * @param options.email The new email address for this user.
   * @param options.fullName The new full name for this user.
   */
  async updateUser({ email, fullName }: { email?: string; fullName?: string }): Promise<User> {
    if (!email && !fullName) {
      throw new Error('Must specify either email or fullName');
    }
    const fieldMask: string[] = [];
    if (email !== undefined) {
      fieldMask.push('email');
    }
    if (fullName !== undefined) {
      fieldMask.push('fullName');
    }
    const body = {
      user: {
        email,
        fullName,
      },
      updateMask: fieldMask.join(','),
    };
    const result: { user: User } = await this.requestJson('/api/v1/users/me', body, 'PUT');
    return result.user;
  }

  /** List Corpora visible to this user.
   * @param options.teamId Optional team ID to list corpora for.
   * @param options.offset The offset into the list of corpora to return.
   * @param options.limit The maximum number of corpora to return.
   */
  listCorpora({
    teamId,
    offset = 0,
    limit = 100,
  }: {
    teamId?: string;
    offset?: number;
    limit?: number;
  }): Promise<Jsonifiable> {
    if (teamId !== undefined) {
      return this.requestJson(`/api/v1/corpora?team_id=${teamId}&offset=${offset}&limit=${limit}`);
    }
    return this.requestJson(`/api/v1/corpora?offset=${offset}&limit=${limit}`);
  }

  /**
   * Get information about a given Corpus.
   *
   * @param corpusId The ID of the Corpus to get.
   */
  getCorpus(corpusId: string): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/corpora/${corpusId}`);
  }

  /**
   * Create a new Corpus.
   *
   * @param options.name The name of the new Corpus.
   * @param options.description The description of the new Corpus.
   * @param options.teamId Optional team ID to own the new Corpus.
   */
  createCorpus({
    name,
    description,
    teamId,
  }: {
    name?: string;
    description?: string;
    teamId?: string;
  }): Promise<Jsonifiable> {
    const body = {
      teamId,
      corpus: {
        display_name: name,
        description,
      },
    };
    return this.requestJson('/api/v1/corpora', body);
  }

  /**
   * Update a Corpus.
   *
   * @param options.name The new name of the Corpus.
   * @param options.description The new description of the Corpus.
   */
  updateCorpus({
    corpusId,
    displayName,
    description,
  }: {
    corpusId: string;
    displayName?: string;
    description?: string;
  }): Promise<Jsonifiable> {
    if (!displayName && !description) {
      throw new Error('Must specify either displayName or description');
    }
    const fieldMask: string[] = [];
    if (displayName !== undefined) {
      fieldMask.push('displayName');
    }
    if (description !== undefined) {
      fieldMask.push('description');
    }
    const body = {
      corpus: {
        corpus_id: corpusId,
        displayName,
        description,
      },
      updateMask: fieldMask.join(','),
    };
    return this.requestJson(`/api/v1/corpora/${corpusId}`, body, 'PUT');
  }

  /**
   * Query a given Corpus.
   *
   * @param options.corpusId The ID of the Corpus to query.
   * @param options.query The query to run.
   * @param options.maxChunks The maximum number of chunks to return.
   */
  queryCorpus({
    corpusId,
    query,
    maxChunks,
  }: {
    corpusId: string;
    query: string;
    maxChunks?: number;
  }): Promise<Jsonifiable> {
    const body = {
      corpus_id: corpusId,
      query,
      max_chunks: maxChunks,
    };
    return this.requestJson(`/api/v1/corpora/${corpusId}:query`, body);
  }

  /**
   * Delete a given Corpus.
   *
   * @param options.corpusId The ID of the Corpus to delete.
   */
  deleteCorpus({ corpusId }: { corpusId: string }): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/corpora/${corpusId}`, undefined, 'DELETE');
  }

  /**
   * List the Sources in a given Corpus.
   *
   * @param options.corpusId The ID of the Corpus to list Sources for.
   * @param options.offset The offset into the list of Sources to return.
   * @param options.limit The maximum number of Sources to return.
   */
  listCorpusSources({
    corpusId,
    offset = 0,
    limit = 100,
  }: {
    corpusId: string;
    offset?: number;
    limit?: number;
  }): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources?offset=${offset}&limit=${limit}`);
  }

  /**
   * Get information about a given Source.
   *
   * @param options.corpusId The ID of the Corpus that the Source belongs to.
   * @param options.sourceId The ID of the Source to get.
   */
  getCorpusSource({ corpusId, sourceId }: { corpusId: string; sourceId: string }): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}`);
  }

  /**
   * Add a new Source to a Corpus.
   *
   * @param options.corpusId The ID of the Corpus to add the Source to.
   * @param options.startUrls The URLs to start crawling from.
   * @param options.includeGlobs The glob patterns to include.
   * @param options.excludeGlobs The glob patterns to exclude.
   * @param options.maxDocuments The maximum number of documents to crawl.
   * @param options.maxDepth The maximum depth to crawl.
   * @param options.description The description of the new Source.
   * @param options.displayName The display name of the new Source.
   */
  addCorpusSource({
    corpusId,
    startUrls,
    includeGlobs,
    excludeGlobs,
    maxDocuments,
    maxDepth,
    description,
    displayName,
  }: {
    corpusId: string;
    startUrls: string[];
    includeGlobs?: string[];
    excludeGlobs?: string[];
    maxDocuments?: number;
    maxDepth?: number;
    description?: string;
    displayName?: string;
  }): Promise<Jsonifiable> {
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
   * Add a new file Source to a Corpus.
   *
   * @param options.corpusId The ID of the Corpus to add the Source to.
   * @param options.files The list of files to include in the Source.
   * @param options.description The description of the new Source.
   * @param options.displayName The display name of the new Source.
   */
  async addCorpusFileSource({
    corpusId,
    files,
    description,
    displayName,
  }: {
    corpusId: string;
    files: {
      filename: string;
      mimeType: string;
      contents: Blob;
    }[];
    description?: string;
    displayName?: string;
  }): Promise<Jsonifiable> {
    const body = {
      corpus_id: corpusId,
      source: {
        corpus_id: corpusId,
        displayName,
        description,
        load_spec: {
          max_documents: files.length,
          static: {
            documents: await Promise.all(
              files.map(async (file) => ({
                filename: file.filename,
                mime_type: file.mimeType,
                contents: encode(await file.contents.arrayBuffer()),
              }))
            ),
          },
        },
      },
    };
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources`, body);
  }

  /**
   * Update a Source.
   *
   * @param options.name The new name of the Source.
   * @param options.description The new description of the Source.
   */
  updateCorpusSource({
    corpusId,
    sourceId,
    displayName,
    description,
  }: {
    corpusId: string;
    sourceId: string;
    displayName?: string;
    description?: string;
  }): Promise<Jsonifiable> {
    if (!displayName && !description) {
      throw new Error('Must specify at least one of displayName or description');
    }
    const fieldMask: string[] = [];
    if (displayName !== undefined) {
      fieldMask.push('displayName');
    }
    if (description !== undefined) {
      fieldMask.push('description');
    }
    const body = {
      source: {
        corpus_id: corpusId,
        source_id: sourceId,
        displayName,
        description,
      },
      updateMask: fieldMask.join(','),
    };
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}`, body, 'PUT');
  }

  /**
   * Delete a given Source.
   *
   * The source must have no running jobs and no remaining documents. Use clearCorpusSource() to remove all documents.
   *
   * @param options.corpusId The ID of the Corpus that the Source belongs to.
   * @param options.sourceId The ID of the Source to delete.
   */
  deleteCorpusSource({ corpusId, sourceId }: { corpusId: string; sourceId: string }): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}`, undefined, 'DELETE');
  }

  /**
   * Refresh the given Source.
   *
   * If a job is already running on this source, and force = false, this call will return an error.
   * If a job is already running on this source, and force = true, that job will be killed and restarted.
   *
   * @param options.corpusId The ID of the Corpus that the Source belongs to.
   * @param options.sourceId The ID of the Source to refresh.
   * @param options.force Stop any in-progress jobs to refresh the source.
   */
  refreshCorpusSource({
    corpusId,
    sourceId,
    force = false,
  }: {
    corpusId: string;
    sourceId: string;
    force?: boolean;
  }): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}:refresh`, { force });
  }

  /**
   * Clear the given Source, removing all its documents and their chunks.
   *
   * If a job is already running on this source, and force = false, this call will return an error.
   * If a job is already running on this source, and force = true, that job will be killed.
   *
   * @param options.corpusId The ID of the Corpus that the Source belongs to.
   * @param options.sourceId The ID of the Source to clear.
   * @param options.force Stop any in-progress jobs before clearing the Source.
   */
  clearCorpusSource({
    corpusId,
    sourceId,
    force = false,
  }: {
    corpusId: string;
    sourceId: string;
    force?: boolean;
  }): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}:clear`, { force });
  }

  /**
   * List Jobs associated with a given Source.
   *
   * @param options.corpusId The ID of the Corpus that the Source belongs to.
   * @param options.sourceId The ID of the Source.
   * @param options.offset The offset into the list of Jobs to return.
   * @param options.limit The maximum number of Jobs to return.
   */
  listCorpusSourceJobs({
    corpusId,
    sourceId,
    offset = 0,
    limit = 100,
  }: {
    corpusId: string;
    sourceId: string;
    offset?: number;
    limit?: number;
  }): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}/jobs?offset=${offset}&limit=${limit}`);
  }

  /**
   * Get information about a given Job.
   *
   * @param options.corpusId The ID of the Corpus that the Job belongs to.
   * @param options.sourceId The ID of the Source that the Job belongs to.
   * @param options.jobId The ID of the Job to get.
   */
  getCorpusSourceJob({
    corpusId,
    sourceId,
    jobId,
  }: {
    corpusId: string;
    sourceId: string;
    jobId: string;
  }): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}/jobs/${jobId}`);
  }

  /**
   * List Documents in a given Corpus Source.
   *
   * @param options.corpusId The ID of the Corpus that the Source belongs to.
   * @param options.sourceId The ID of the Source.
   * @param options.offset The offset into the list of Documents to return.
   * @param options.limit The maximum number of Documents to return.
   */
  listCorpusSourceDocuments({
    corpusId,
    sourceId,
    offset = 0,
    limit = 100,
  }: {
    corpusId: string;
    sourceId: string;
    offset?: number;
    limit?: number;
  }): Promise<Jsonifiable> {
    return this.requestJson(
      `/api/v1/corpora/${corpusId}/sources/${sourceId}/documents?offset=${offset}&limit=${limit}`
    );
  }

  /**
   * Get information about a given Document.
   *
   * @param options.corpusId The ID of the Corpus that the Document belongs to.
   * @param options.sourceId The ID of the Source that the Document belongs to.
   * @param options.documentId The ID of the Document to get.
   */
  getCorpusSourceDocument({
    corpusId,
    sourceId,
    documentId,
  }: {
    corpusId: string;
    sourceId: string;
    documentId: string;
  }): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}/documents/${documentId}`);
  }

  /**
   * Start a new conversation with an agent, optionally sending the initial message. (If you don't send the initial
   * message, the agent may.)
   *
   * @param options.agentId The ID of the agent to start a conversation with.
   * @param options.message The initial message to send to the agent, if any.
   * @param options.metadata Any metadata to attach to the message.
   *
   * @returns {Promise<ReadableStream<Conversation>>} A stream of Conversation objects. Each member of the stream is
   * the latest value of the conversation as the agent streams its response. So, if you're driving a UI with thisresponse,
   * you always want to render the most recently emitted value from the stream.
   *
   * @see sendMessage
   * @see stopGeneration
   * @see regenerate
   */
  startConversation({ agentId, message, metadata }: { agentId: AgentId; message?: string; metadata?: Metadata }) {
    return this.requestJsonLines<Conversation>(
      `/api/v1/agents/${agentId}/conversations`,
      message ? { message, metadata } : undefined,
      'POST'
    );
  }

  /**
   * Get a conversation by ID.
   *
   * @param options.agentId The ID of the agent that the conversation belongs to.
   * @param options.conversationId The ID of the conversation to get.
   *
   * @returns {Promise<Conversation>} The conversation.
   */
  getConversation({ agentId, conversationId }: { agentId: AgentId; conversationId: ConversationId }) {
    return this.requestJson<Conversation>(`/api/v1/agents/${agentId}/conversations/${conversationId}`);
  }

  /**
   * Send a message to a conversation. If the conversationId does not refer to a conversation that already exists,
   * this will throw an error.
   *
   * @param options.agentId The ID of the agent that the conversation belongs to.
   * @param options.conversationId The ID of the conversation to send the message to.
   * @param options.message The message to send.
   * @param options.metadata Any metadata to attach to the message.
   *
   * @returns {Promise<ReadableStream<AssistantConversationTurn>>} A stream of ConversationTurn objects. Each member of the
   * stream is the latest value of the turn as the agent streams its response. So, if you're driving a UI with this
   * response, you always want to render the most recently emitted value from the stream.
   *
   * @see startConversation
   */
  sendMessage({
    agentId,
    conversationId,
    message,
    metadata,
  }: {
    agentId: AgentId;
    conversationId: ConversationId;
    message: string;
    metadata?: Metadata;
  }) {
    return this.requestJsonLines<AssistantConversationTurn>(
      `/api/v1/agents/${agentId}/conversations/${conversationId}/messages`,
      { message, metadata },
      'POST'
    );
  }

  /**
   * Stop a message that is currently being generated.
   *
   * @param options.agentId The ID of the agent that the conversation belongs to.
   * @param options.conversationId The ID of the conversation to stop generating a message for.
   * @param options.messageId The ID of the message to stop generating.
   */
  stopGeneration({
    agentId,
    conversationId,
    messageId,
  }: {
    agentId: AgentId;
    conversationId: ConversationId;
    messageId: string;
  }) {
    return this.request(
      `/api/v1/agents/${agentId}/conversations/${conversationId}/messages/${messageId}/stop`,
      undefined,
      'POST'
    );
  }

  /**
   * Regenerate a message that has already been generated. If `messageId` is not the most recent message in the
   * conversation, this request will fail.
   *
   * @param options.agentId The ID of the agent that the conversation belongs to.
   * @param options.conversationId The ID of the conversation to regenerate a message for.
   * @param options.messageId The ID of the message to regenerate.
   *
   * @returns {Promise<ReadableStream<AssistantConversationTurn>>} A stream of ConversationTurn objects. Each member of the
   * stream is the latest value of the turn as the agent streams its response. So, if you're driving a UI with this
   * response, you always want to render the most recently emitted value from the stream.
   *
   * @see stopGeneration
   */
  regenerate({
    agentId,
    conversationId,
    messageId,
  }: {
    agentId: AgentId;
    conversationId: ConversationId;
    messageId: string;
  }) {
    return this.requestJsonLines<AssistantConversationTurn>(
      `/api/v1/agents/${agentId}/conversations/${conversationId}/messages/${messageId}/regenerate`,
      undefined,
      'POST'
    );
  }

  /** Return information about a given user. */
  async getUser({ userId }: { userId: string }): Promise<User> {
    const rawUserInfo: { user: User } = await this.requestJson(`/api/v1/users/${userId}`);
    return rawUserInfo.user;
  }

  /** Create a new team. */
  async createTeam({
    displayName,
    description,
    avatarUrl,
  }: {
    displayName?: string;
    description?: string;
    avatarUrl?: string;
  }): Promise<Team> {
    const response: { team: Team } = await this.requestJson('/api/v1/teams', {
      team: {
        displayName,
        description,
        avatarUrl,
      },
    });
    return response.team;
  }

  /** Get the given team. */
  async getTeam({ teamId }: { teamId: string }): Promise<Team> {
    const response: { team: Team } = await this.requestJson(`/api/v1/teams/${teamId}`);
    return response.team;
  }

  /** Delete the given team. */
  deleteTeam({ teamId }: { teamId: string }): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/teams/${teamId}`, undefined, 'DELETE');
  }

  /**
   * List the teams visible to the current user.
   *
   * @param options.offset The offset into the list of teams to return.
   * @param options.limit The maximum number of teams to return.
   */
  listTeams({ offset = 0, limit = 100 }: { offset?: number; limit?: number }): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/teams?offset=${offset}&limit=${limit}`);
  }

  /**
   * Update the given team's metadata.
   *
   * @param options.displayName The new display name for the team.
   * @param options.description The new description for the team.
   */
  async updateTeam({
    teamId,
    displayName,
    description,
  }: {
    teamId: string;
    displayName?: string;
    description?: string;
  }): Promise<Team> {
    if (!displayName && !description) {
      throw new Error('Must specify either displayName or description');
    }
    const fieldMask: string[] = [];
    if (displayName !== undefined) {
      fieldMask.push('displayName');
    }
    if (description !== undefined) {
      fieldMask.push('description');
    }
    const body = {
      team: {
        displayName,
        description,
      },
      updateMask: fieldMask.join(','),
    };
    const response: { team: Team } = await this.requestJson(`/api/v1/teams/${teamId}`, body, 'PUT');
    return response.team;
  }

  /**
   * Invite a new member to a team.
   *
   * @param options.teamId The ID of the team to invite the member to.
   * @param options.email The email address of the member to invite.
   * @param options.isAdmin Whether the member should be a team admin.
   */
  inviteTeamMember({
    teamId,
    email,
    isAdmin,
  }: {
    teamId: string;
    email: string;
    isAdmin?: boolean;
  }): Promise<Jsonifiable> {
    const body = {
      teamId,
      email,
      role: {
        isAdmin,
      },
    };
    return this.requestJson(`/api/v1/teams/${teamId}/invite`, body, 'POST');
  }

  /**
   * Cancel a pending invitation to a team.
   *
   * @param options.teamId The ID of the team to cancel the invitation for.
   * @param options.email The email address of the member to cancel the invitation for.
   */
  cancelInvitation({ teamId, email }: { teamId: string; email: string }): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/teams/${teamId}/invite/${email}`, null, 'DELETE');
  }

  /**
   * Remove a member from a team.
   *
   * @param options.teamId The ID of the team to invite the member to.
   * @param options.userId The user ID of the member to remove.
   */
  removeTeamMember({ teamId, userId }: { teamId: string; userId: string }): Promise<Jsonifiable> {
    return this.requestJson(`/api/v1/teams/${teamId}/members/${userId}`, null, 'DELETE');
  }

  /**
   * Update a user's role on a team.
   *
   * @param options.teamId The ID of the team to update.
   * @param options.userId The user ID of the member to update.
   * @param options.isAdmin Set the admin role for this user.
   */
  updateTeamMember({
    teamId,
    userId,
    isAdmin,
  }: {
    teamId: string;
    userId: string;
    isAdmin: boolean;
  }): Promise<Jsonifiable> {
    const body = {
      teamId,
      userId,
      role: {
        isAdmin,
      },
    };
    return this.requestJson(`/api/v1/teams/${teamId}/members/${userId}`, body, 'PUT');
  }
}
