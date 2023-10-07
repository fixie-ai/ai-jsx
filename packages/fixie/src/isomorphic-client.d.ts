import type { Jsonifiable } from 'type-fest';
import { AgentId, ConversationId, MessageGenerationParams, MessageRequestParams } from './sidekick-types.js';
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
export declare class AgentDoesNotExistError extends Error {
    code: string;
}
/**
 * Represents an error that occurs when the Fixie client encounters an error contacting
 * the API endxpoint.
 */
export declare class FixieClientError extends Error {
    url: string;
    statusCode: number;
    statusText: string;
    detail: unknown;
    constructor(url: string, statusCode: number, statusText: string, message?: string, detail?: unknown);
}
/**
 * A client to the Fixie AI platform.
 *
 * This client can be used on the web or in NodeJS
 */
export declare class IsomorphicFixieClient {
    readonly url: string;
    readonly apiKey?: string | undefined;
    /**
     * Use the `Create*` methods instead.
     */
    protected constructor(url: string, apiKey?: string | undefined);
    static Create(url: string, apiKey?: string): IsomorphicFixieClient;
    /**
     * Create a new FixieClient without an API key. This is only useful for accessing public APIs, such as the conversation APIs.
     *
     * You only need to pass url if you're pointing to a different Fixie backend than the default production. Unless you specificially know you need to do this, you don't.
     */
    static CreateWithoutApiKey(url?: string): IsomorphicFixieClient;
    /** Send a request to the Fixie API with the appropriate auth headers. */
    request(path: string, bodyData?: unknown, method?: string, options?: RequestInit): Promise<Response>;
    requestJson(path: string, bodyData?: unknown, method?: string): Promise<Jsonifiable>;
    /** Return information on the currently logged-in user. */
    userInfo(): Promise<UserInfo>;
    /** List Corpora visible to this user.
     * @param ownerType
     *   OWNER_USER: Only list corpora owned by the current user.
     *   OWNER_ORG: Only list corpora owned by the current user's organization.
     *   OWNER_PUBLIC: Only list public corpora.
     *   OWNER_ALL: List all corpora visible to the current user.
     */
    listCorpora(ownerType?: 'OWNER_USER' | 'OWNER_ORG' | 'OWNER_PUBLIC' | 'OWNER_ALL'): Promise<Jsonifiable>;
    /** Get information about a given Corpus. */
    getCorpus(corpusId: string): Promise<Jsonifiable>;
    /** Create a new Corpus. */
    createCorpus(name?: string, description?: string): Promise<Jsonifiable>;
    /** Query a given Corpus. */
    queryCorpus(corpusId: string, query: string, maxChunks?: number): Promise<Jsonifiable>;
    /** List the Sources in a given Corpus. */
    listCorpusSources(corpusId: string): Promise<Jsonifiable>;
    /** Get information about a given Source. */
    getCorpusSource(corpusId: string, sourceId: string): Promise<Jsonifiable>;
    /** Add a new Source to a Corpus. */
    addCorpusSource(corpusId: string, startUrls: string[], includeGlobs?: string[], excludeGlobs?: string[], maxDocuments?: number, maxDepth?: number, description?: string, displayName?: string): Promise<Jsonifiable>;
    /**
     * Delete a given Source.
     *
     * The source must have no running jobs and no remaining documents. Use clearCorpusSource() to remove all documents.
     */
    deleteCorpusSource(corpusId: string, sourceId: string): Promise<Jsonifiable>;
    /**
     * Refresh the given Source.
     *
     * If a job is already running on this source, and force = false, this call will return an error.
     * If a job is already running on this source, and force = true, that job will be killed and restarted.
     */
    refreshCorpusSource(corpusId: string, sourceId: string, force?: boolean): Promise<Jsonifiable>;
    /**
     * Clear the given Source, removing all its documents and their chunks.
     *
     * If a job is already running on this source, and force = false, this call will return an error.
     * If a job is already running on this source, and force = true, that job will be killed and restarted.
     */
    clearCorpusSource(corpusId: string, sourceId: string, force?: boolean): Promise<Jsonifiable>;
    /** List Jobs associated with a given Source. */
    listCorpusSourceJobs(corpusId: string, sourceId: string): Promise<Jsonifiable>;
    /** Get information about a given Job. */
    getCorpusSourceJob(corpusId: string, sourceId: string, jobId: string): Promise<Jsonifiable>;
    /** List Documents in a given Corpus Source. */
    listCorpusSourceDocs(corpusId: string, sourceId: string): Promise<Jsonifiable>;
    /** Get information about a given Document. */
    getCorpusSourceDoc(corpusId: string, sourceId: string, docId: string): Promise<Jsonifiable>;
    /**
     * @experimental this API may change at any time.
     *
     * Start a new conversation with an agent, optionally sending the initial message. (If you don't send the initial
     * message, the agent may.)
     *
     * @returns {Object} An object with the following properties:
     *    @property {string} conversationId - The conversation ID, which can be used with the other API methods to continue the
     *                                         conversation.
     *    @property {Object} response - The fetch response. The response will be a stream of newline-delimited JSON objects,
     *                                  each of which be of the shape ConversationTurn. Each member of the stream is the latest
     *                                  value of the turn as the agent streams its response. So, if you're driving a UI with this
     *                                  response, you always want to render the most recently emitted value from the stream.
     *
     *          If the generation is stopped via the stopGeneration() API, the final value emitted from the stream will be
     *          the same as what's persisted to the conversation history. However, intermediate stream values may include
     *          extra content that then disappears. For example:
     *
     *            Stream entry 0: text: hello wor
     *            <the stop occurs>
     *            Stream entry 1: text: hello world I am
     *            Stream entry 2: text: hello world
     *
     * @see sendMessage
     * @see stopGeneration
     * @see regenerate
     */
    startConversation(agentId: AgentId, generationParams: MessageGenerationParams, message?: string): Promise<{
        conversationId: string;
        response: Response;
    }>;
    /**
     * @experimental this API may change at any time.
     *
     * Send a message to a conversation. If the conversationId does not refer to a conversation that already exists,
     * this will throw an error.
     *
     * @returns a fetch response. The response will be a stream of newline-delimited JSON objects, each of which will be
     *          of shape AssistantConversationTurn. Each member of the stream is the latest value of the turn as the agent
     *          streams its response. So, if you're driving a UI with this response, you always want to render the
     *          most recently emitted value from the stream.
     *
     *          If the generation is stopped via the stopGeneration() API, the final value emitted from the stream will be
     *          the same as what's persisted to the conversation history. However, intermediate stream values may include
     *          extra content that then disappears. For example:
     *
     *            Stream entry 0: text: hello wor
     *            <the stop occurs>
     *            Stream entry 1: text: hello world I am
     *            Stream entry 2: text: hello world
     *
     * @see startConversation
     */
    sendMessage(agentId: AgentId, conversationId: ConversationId, message: MessageRequestParams): Promise<Response>;
    /**
     * @experimental this API may change at any time.
     *
     * Stop a message that is currently being generated.
     */
    stopGeneration(agentId: AgentId, conversationId: ConversationId, messageId: string): Promise<Response>;
    /**
     * @experimental this API may change at any time.
     *
     * Regenerate a message that has already been generated. If `messageId` is not the most recent message in the
     * conversation, this request will fail.
     *
     * @returns a fetch response. The response will be a stream of newline-delimited JSON objects, each of which will be
     *          of shape AssistantConversationTurn. Each member of the stream is the latest value of the turn as the agent
     *          streams its response. So, if you're driving a UI with this response, you always want to render the
     *          most recently emitted value from the stream.
     *
     *          If the generation is stopped via the stopGeneration() API, the final value emitted from the stream will be
     *          the same as what's persisted to the conversation history. However, intermediate stream values may include
     *          extra content that then disappears. For example:
     *
     *            Stream entry 0: text: hello wor
     *            <the stop occurs>
     *            Stream entry 1: text: hello world I am
     *            Stream entry 2: text: hello world
     */
    regenerate(agentId: AgentId, conversationId: ConversationId, messageId: string, messageGenerationParams: MessageGenerationParams): Promise<Response>;
}
