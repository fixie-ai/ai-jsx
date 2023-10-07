export class AgentDoesNotExistError extends Error {
    code = 'agent-does-not-exist';
}
/**
 * Represents an error that occurs when the Fixie client encounters an error contacting
 * the API endxpoint.
 */
export class FixieClientError extends Error {
    url;
    statusCode;
    statusText;
    detail;
    constructor(url, statusCode, statusText, message, detail = {}) {
        super(message);
        this.url = url;
        this.statusCode = statusCode;
        this.statusText = statusText;
        this.name = 'FixieClientError';
        this.detail = detail;
    }
}
const debug = typeof process !== 'undefined' &&
    // Don't make any assumptions about the environment.
    /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
    process.env?.FIXIE_DEBUG === 'true';
/**
 * A client to the Fixie AI platform.
 *
 * This client can be used on the web or in NodeJS
 */
export class IsomorphicFixieClient {
    url;
    apiKey;
    /**
     * Use the `Create*` methods instead.
     */
    constructor(url, apiKey) {
        this.url = url;
        this.apiKey = apiKey;
    }
    static Create(url, apiKey) {
        const apiKeyToUse = apiKey ?? process.env.FIXIE_API_KEY;
        if (!apiKeyToUse) {
            throw new Error('You must pass apiKey to the constructor, or set the FIXIE_API_KEY environment variable. The API key can be found at: https://console.fixie.ai/profile');
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
    static CreateWithoutApiKey(url) {
        return new this(url ?? 'https://api.fixie.ai');
    }
    /** Send a request to the Fixie API with the appropriate auth headers. */
    async request(path, bodyData, method, options = {}) {
        const fetchMethod = method ?? (bodyData ? 'POST' : 'GET');
        const headers = {};
        if (bodyData) {
            headers['Content-Type'] = 'application/json';
        }
        if (this.apiKey) {
            headers.Authorization = `Bearer ${this.apiKey}`;
        }
        if (debug) {
            console.log(`[Fixie request] ${this.url}${path}`, bodyData);
        }
        const url = `${this.url}${path}`;
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
            throw new FixieClientError(url, res.status, res.statusText, `Error accessing Fixie API: ${url}`, await res.text());
        }
        return res;
    }
    async requestJson(path, bodyData, method) {
        const response = await this.request(path, bodyData, method);
        return response.json();
    }
    /** Return information on the currently logged-in user. */
    userInfo() {
        const rawUserInfo = this.requestJson('/api/user');
        return rawUserInfo;
    }
    /** List Corpora visible to this user.
     * @param ownerType
     *   OWNER_USER: Only list corpora owned by the current user.
     *   OWNER_ORG: Only list corpora owned by the current user's organization.
     *   OWNER_PUBLIC: Only list public corpora.
     *   OWNER_ALL: List all corpora visible to the current user.
     */
    listCorpora(ownerType) {
        if (ownerType !== undefined) {
            return this.requestJson(`/api/v1/corpora?owner_type=${ownerType}`);
        }
        return this.requestJson('/api/v1/corpora');
    }
    /** Get information about a given Corpus. */
    getCorpus(corpusId) {
        return this.requestJson(`/api/v1/corpora/${corpusId}`);
    }
    /** Create a new Corpus. */
    createCorpus(name, description) {
        const body = {
            corpus: {
                display_name: name,
                description,
            },
        };
        return this.requestJson('/api/v1/corpora', body);
    }
    /** Query a given Corpus. */
    queryCorpus(corpusId, query, maxChunks) {
        const body = {
            corpus_id: corpusId,
            query,
            max_chunks: maxChunks,
        };
        return this.requestJson(`/api/v1/corpora/${corpusId}:query`, body);
    }
    /** List the Sources in a given Corpus. */
    listCorpusSources(corpusId) {
        return this.requestJson(`/api/v1/corpora/${corpusId}/sources`);
    }
    /** Get information about a given Source. */
    getCorpusSource(corpusId, sourceId) {
        return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}`);
    }
    /** Add a new Source to a Corpus. */
    addCorpusSource(corpusId, startUrls, includeGlobs, excludeGlobs, maxDocuments, maxDepth, description, displayName) {
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
    deleteCorpusSource(corpusId, sourceId) {
        return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}`, undefined, 'DELETE');
    }
    /**
     * Refresh the given Source.
     *
     * If a job is already running on this source, and force = false, this call will return an error.
     * If a job is already running on this source, and force = true, that job will be killed and restarted.
     */
    refreshCorpusSource(corpusId, sourceId, force) {
        return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}:refresh`, { force });
    }
    /**
     * Clear the given Source, removing all its documents and their chunks.
     *
     * If a job is already running on this source, and force = false, this call will return an error.
     * If a job is already running on this source, and force = true, that job will be killed and restarted.
     */
    clearCorpusSource(corpusId, sourceId, force) {
        return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}:clear`, { force });
    }
    /** List Jobs associated with a given Source. */
    listCorpusSourceJobs(corpusId, sourceId) {
        return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}/jobs`);
    }
    /** Get information about a given Job. */
    getCorpusSourceJob(corpusId, sourceId, jobId) {
        return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}/jobs/${jobId}`);
    }
    /** List Documents in a given Corpus Source. */
    listCorpusSourceDocs(corpusId, sourceId) {
        return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}/documents`);
    }
    /** Get information about a given Document. */
    getCorpusSourceDoc(corpusId, sourceId, docId) {
        return this.requestJson(`/api/v1/corpora/${corpusId}/sources/${sourceId}/documents/${docId}`);
    }
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
    async startConversation(agentId, generationParams, message) {
        const abortController = new AbortController();
        const signal = abortController.signal;
        const conversation = await this.request(`/api/v1/agents/${agentId}/conversations`, { generationParams, message }, 'POST', { signal });
        if (!conversation.body) {
            throw new Error('Request to start a new conversation was empty');
        }
        if (conversation.status === 404) {
            throw new AgentDoesNotExistError(`Agent ${agentId} does not exist, or is private.`);
        }
        const headerName = 'X-Fixie-Conversation-Id';
        const conversationId = conversation.headers.get(headerName);
        if (!conversationId) {
            throw new Error(`Fixie bug: Fixie backend did not return the "${headerName}" header.`);
        }
        return { conversationId, response: conversation };
    }
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
    sendMessage(agentId, conversationId, message) {
        return this.request(`/api/v1/agents/${agentId}/conversations/${conversationId}/messages`, message);
    }
    /**
     * @experimental this API may change at any time.
     *
     * Stop a message that is currently being generated.
     */
    stopGeneration(agentId, conversationId, messageId) {
        return this.request(`/api/v1/agents/${agentId}/conversations/${conversationId}/messages/${messageId}/stop`, undefined, 'POST');
    }
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
    regenerate(agentId, conversationId, messageId, messageGenerationParams) {
        return this.request(`/api/v1/agents/${agentId}/conversations/${conversationId}/messages/${messageId}/regenerate`, {
            generationParams: messageGenerationParams,
        });
    }
}
