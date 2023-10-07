import { collection, FirestoreError } from 'firebase/firestore';
import { SetStateAction, Dispatch } from 'react';
import { MessageGenerationParams, AgentId, ConversationTurn, ConversationId } from './sidekick-types.js';
import { Jsonifiable } from 'type-fest';
import { IsomorphicFixieClient } from './isomorphic-client.js';
/**
 * The result of the useFixie hook.
 */
export interface UseFixieResult {
    /**
     * The conversation history.
     */
    turns: ConversationTurn[];
    /**
     * A signal indicating how the data is being loaded from Firebase.
     * This is _not_ an indicator of whether the LLM is currently generating a response.
     */
    loadState: 'loading' | 'loaded' | FirestoreError | 'no-conversation-set';
    /**
     * Whether the model is currently responding to the most recent message.
     */
    modelResponseInProgress: boolean;
    /**
     * Regenerate the most recent model response.
     */
    regenerate: () => Promise<void> | Promise<Response>;
    /**
     * Request a stop of the current model response.
     *
     * The model will stop generation after it gets the request, but you may see a few more
     * tokens stream in before that happens.
     */
    stop: () => Promise<void> | Promise<Response>;
    /**
     * Append `message` to the conversation. This does not change `input`.
     *
     * If you omit `message`, the current value of `input` will be used instead.
     *
     */
    sendMessage: (message?: string) => Promise<void> | Promise<Response>;
    /**
     * A managed input value. This is the text the user is currently typing.
     */
    input: string;
    /**
     * If reading from Firebase resulted in an error, it'll be stored in this object.
     */
    error: FirestoreError | undefined;
    /**
     * A function to set the input.
     */
    setInput: Dispatch<SetStateAction<string>>;
    /**
     * True if the conversation exists; false if it does not.
     *
     * If the Firebase connection hasn't loaded yet, this will be undefined.
     */
    conversationExists?: boolean;
}
/**
 * Arguments passed to the useFixie hook.
 */
export interface UseFixieArgs {
    /**
     * The ID of the conversation to use.
     *
     * If omitted, the hook will return a no-op for most functions.
     */
    conversationId?: string;
    /**
     * The agentID to use.
     *
     * @example my-username/my-agent-name
     */
    agentId: AgentId;
    /**
     * A function that will be called whenever the model generates new text.
     *
     * If the model generates a sentence like "I am a brown dog", this function may be called with:
     *
     *    onNewTokens("I am")
     *    onNewTokens("a")
     *    onNewTokens("brown dog")
     */
    onNewTokens?: (tokens: string) => void;
    /**
     * If passed, this conversation value will be used instead of whatever's in the database.
     * Use this to show fixture data.
     */
    conversationFixtures?: ConversationTurn[];
    messageGenerationParams?: Partial<Pick<MessageGenerationParams, 'model' | 'modelProvider'>>;
    logPerformanceTraces?: (message: string, metadata: object) => void;
    fixieAPIUrl?: string;
    fixieAPIKey?: string;
    onNewConversation?: (conversationId: ConversationId) => void;
}
/**
 * An event that will be fired when the model has emitted new tokens.
 */
export declare class NewTokensEvent extends Event {
    readonly tokens: string;
    constructor(tokens: string);
}
/**
 * An event that will be emitted when there are perf traces to log.
 * If you would like to log them, listen for this event, and use the `data` and `message` properties to log to whatever
 * your monitoring system is.
 */
export declare class PerfLogEvent extends Event {
    readonly message: string;
    readonly data: object;
    constructor(message: string, data: object);
}
/**
 * A client that maintains a connection to a particular conversation.
 */
export declare class FixieConversationClient extends EventTarget {
    readonly conversationId: ConversationId;
    private readonly fixieClient;
    private performanceTrace;
    private lastGeneratedTurnId;
    private lastTurnForWhichHandleNewTokensWasCalled;
    addPerfCheckpoint(name: string, data?: Jsonifiable): void;
    /**
     * We do state management for optimistic UI.
     *
     * For stop/regenerate, if we simply request a stop/regenerate, the UI won't update until Fixie Frame updates
     * Firebase and that update is seen by the client. Instead, we'd rather optimistically update.This requires managing
     * an intermediate layer of state.
     */
    private modelResponseRequested;
    private lastAssistantMessagesAtStop;
    private readonly conversationFirebaseDoc;
    private loadState;
    private turns;
    private isEmpty?;
    optimisticallyExists: boolean;
    private lastSeenMostRecentAgentTextMessage;
    constructor(conversationId: ConversationId, fixieClient: IsomorphicFixieClient, conversationsRoot: ReturnType<typeof collection>);
    private dispatchStateChangeEvent;
    addStateChangeEventListener(listener: EventListenerOrEventListenerObject): void;
    removeStateChangeEventListener(listener: EventListenerOrEventListenerObject): void;
    exists(): boolean | undefined;
    private flushPerfTrace;
    getLoadState(): "loading" | FirestoreError | "loaded" | "no-conversation-set";
    getTurns(): ConversationTurn[];
    sendMessage(agentId: AgentId, message: string, messageGenerationParams: MessageGenerationParams): Promise<Response>;
    regenerate(agentId: AgentId, fullMessageGenerationParams: MessageGenerationParams): Promise<Response>;
    stop(agentId: AgentId): Promise<Response>;
    private getMostRecentAssistantTurn;
    getModelResponseInProgress(): boolean;
}
/**
 * A client that maintains a connection to the Fixie conversation API.
 */
export declare class FixieChatClient {
    private readonly conversationsRoot;
    private readonly fixieClient;
    private conversations;
    constructor(fixieAPIUrl?: string);
    createNewConversation(input: string, agentId: AgentId, fullMessageGenerationParams: MessageGenerationParams): Promise<FixieConversationClient>;
    getConversation(conversationId: ConversationId): FixieConversationClient;
}
/**
 * @experimental this API may change at any time.
 *
 * This hook manages the state of a Fixie-hosted conversation.
 */
export declare function useFixie({ conversationId: userPassedConversationId, conversationFixtures, onNewTokens, messageGenerationParams, logPerformanceTraces, agentId, fixieAPIUrl, onNewConversation, }: UseFixieArgs): UseFixieResult;
