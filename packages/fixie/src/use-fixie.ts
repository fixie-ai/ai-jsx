import { getFirestore, collection, doc, query, orderBy, FirestoreError, onSnapshot } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

import { useState, SetStateAction, Dispatch, useEffect } from 'react';
import _ from 'lodash';
import {
  MessageGenerationParams,
  AgentId,
  AssistantConversationTurn,
  ConversationTurn,
  TextMessage,
  ConversationId,
} from './sidekick-types.js';
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

const firebaseConfig = {
  apiKey: 'AIzaSyDvFy5eMzIiq3UHfDPwYa2ro90p84-j0lg',
  authDomain: 'fixie-frame.firebaseapp.com',
  projectId: 'fixie-frame',
  storageBucket: 'fixie-frame.appspot.com',
  messagingSenderId: '548385236069',
  appId: '1:548385236069:web:b99de8c5ebd0a66078928c',
  measurementId: 'G-EZNCJS94S7',
};

type ModelRequestedState = 'stop' | 'regenerate' | null;

/**
 * An event that will be fired when the model has emitted new tokens.
 */
export class NewTokensEvent extends Event {
  constructor(public readonly tokens: string) {
    super('newTokens');
  }
}

/**
 * An event that will be emitted when there are perf traces to log.
 * If you would like to log them, listen for this event, and use the `data` and `message` properties to log to whatever
 * your monitoring system is.
 */
export class PerfLogEvent extends Event {
  // I think using `data` as a var name is fine here.
  /* eslint-disable-next-line id-blacklist */
  constructor(public readonly message: string, public readonly data: object) {
    super('perfLog');
  }
}

/**
 * A client that maintains a connection to a particular conversation.
 */
export class FixieConversationClient extends EventTarget {
  // I think using `data` as a var name is fine here.
  /* eslint-disable id-blacklist */
  private performanceTrace: { name: string; timeMs: number; data?: Jsonifiable }[] = [];
  private lastGeneratedTurnId: ConversationTurn['id'] | undefined = undefined;
  private lastTurnForWhichHandleNewTokensWasCalled: ConversationTurn['id'] | undefined = undefined;

  addPerfCheckpoint(name: string, data?: Jsonifiable) {
    this.performanceTrace.push({ name, timeMs: performance.now(), data });
  }
  /* eslint-enable id-blacklist */

  /**
   * We do state management for optimistic UI.
   *
   * For stop/regenerate, if we simply request a stop/regenerate, the UI won't update until Fixie Frame updates
   * Firebase and that update is seen by the client. Instead, we'd rather optimistically update.This requires managing
   * an intermediate layer of state.
   */
  private modelResponseRequested: ModelRequestedState = null;
  private lastAssistantMessagesAtStop: ConversationTurn['messages'] = [];

  private readonly conversationFirebaseDoc: ReturnType<typeof doc>;
  private loadState: UseFixieResult['loadState'] = 'loading';
  private turns: UseFixieResult['turns'] = [];
  private isEmpty?: boolean;
  public optimisticallyExists = false;

  private lastSeenMostRecentAgentTextMessage = '';

  // TODO: Unsubscribe eventually
  constructor(
    public readonly conversationId: ConversationId,
    private readonly fixieClient: IsomorphicFixieClient,
    conversationsRoot: ReturnType<typeof collection>
  ) {
    super();

    this.conversationFirebaseDoc = doc(conversationsRoot, conversationId);

    const turnCollection = collection(this.conversationFirebaseDoc, 'turns');
    const turnsQuery = query(turnCollection, orderBy('timestamp', 'asc')).withConverter({
      toFirestore: _.identity,
      fromFirestore: (snapshot, options) => {
        const snapshotData = snapshot.data(options);
        return {
          id: snapshot.id,
          ...snapshotData,
        };
      },
    });

    onSnapshot(
      turnsQuery,
      (snapshot) => {
        this.isEmpty = snapshot.empty;

        this.loadState = 'loaded';
        // If we use snapshot.docs.forEach, it doesn't execute synchronously,
        // which feels unnecessarily surprising.
        this.turns = Array.from(snapshot.docs.values()).map((doc) => doc.data() as ConversationTurn);

        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const turn = change.doc.data() as ConversationTurn;
            if (turn.role === 'assistant') {
              /**
               * We only want to call onNewTokens when the model is generating new tokens. If turn.state is 'stopped', it'll
               * still generate a new `modified` change, and thus this callback will be called, but we don't want to call
               * onNewTokens.
               *
               * Because we do optimistic UI, it's possible that we've requested a stop, but generation hasn't actually
               * stopped. In this case, we don't wnat to call onNewTokens, so we check modelResponseRequested.
               */
              if (['in-progress', 'done'].includes(turn.state) && this.modelResponseRequested !== 'stop') {
                const lastMessageFromAgent = this.lastSeenMostRecentAgentTextMessage;
                const mostRecentAssistantTextMessage = _.findLast(turn.messages, {
                  kind: 'text',
                }) as TextMessage | undefined;
                if (mostRecentAssistantTextMessage) {
                  const messageIsContinuation =
                    lastMessageFromAgent && mostRecentAssistantTextMessage.content.startsWith(lastMessageFromAgent);
                  const newMessagePart = messageIsContinuation
                    ? mostRecentAssistantTextMessage.content.slice(lastMessageFromAgent.length)
                    : mostRecentAssistantTextMessage.content;

                  if (!messageIsContinuation && this.lastTurnForWhichHandleNewTokensWasCalled === turn.id) {
                    return;
                  }

                  this.lastSeenMostRecentAgentTextMessage = mostRecentAssistantTextMessage.content;

                  if (newMessagePart) {
                    this.lastTurnForWhichHandleNewTokensWasCalled = turn.id;
                    this.addPerfCheckpoint('chat:delta:text', { newText: newMessagePart });
                    this.dispatchEvent(new NewTokensEvent(newMessagePart));
                  }
                }
              }
            }
          }
        });

        if (
          snapshot.docChanges().length &&
          this.turns.every(({ state }) => state === 'done' || state === 'stopped' || state === 'error') &&
          this.performanceTrace.length &&
          this.turns.at(-1)?.id !== this.lastGeneratedTurnId
        ) {
          // I'm not sure if this is at all valuable.
          this.addPerfCheckpoint('all-turns-done-or-stopped-or-errored');
          this.flushPerfTrace();
        }
        this.dispatchStateChangeEvent();
      },
      (error) => {
        this.loadState = error;
        this.dispatchStateChangeEvent();
      }
    );
  }

  private dispatchStateChangeEvent() {
    super.dispatchEvent(new Event('stateChange'));
  }

  public addStateChangeEventListener(listener: EventListenerOrEventListenerObject) {
    super.addEventListener('stateChange', listener);
  }
  public removeStateChangeEventListener(listener: EventListenerOrEventListenerObject) {
    super.removeEventListener('stateChange', listener);
  }

  public exists() {
    if (this.loadState === 'loading' || this.loadState === 'no-conversation-set') {
      return undefined;
    }
    return this.isEmpty === false || this.optimisticallyExists;
  }

  private flushPerfTrace() {
    if (!this.performanceTrace.length) {
      return;
    }

    const latestTurnId = this.turns.at(-1)?.id;
    /**
     * It would be nice to include function calls here too, but we can do that later.
     */
    const textCharactersInMostRecentTurn = _.sumBy(this.turns.at(-1)?.messages, (message) => {
      switch (message.kind) {
        case 'text':
          return message.content.length;
        case 'functionCall':
        case 'functionResponse':
          return 0;
      }
    });

    const commonData = { latestTurnId, textCharactersInMostRecentTurn };

    const firstPerfTrace = this.performanceTrace[0].timeMs;
    const firstFirebaseDelta = _.find(this.performanceTrace, {
      name: 'chat:delta:text',
    })?.timeMs;
    const lastFirebaseDelta = _.findLast(this.performanceTrace, {
      name: 'chat:delta:text',
    })?.timeMs;

    this.dispatchEvent(
      new PerfLogEvent('[DD] All traces', {
        traces: this.performanceTrace,
        ...commonData,
      })
    );
    if (firstFirebaseDelta) {
      this.dispatchEvent(
        new PerfLogEvent('[DD] All traces after first Firebase delta', {
          ...commonData,
          timeMs: firstFirebaseDelta - firstPerfTrace,
        })
      );
      const totalFirebaseTimeMs = lastFirebaseDelta! - firstPerfTrace;
      this.dispatchEvent(
        new PerfLogEvent('[DD] Time to last Firebase delta', {
          ...commonData,
          timeMs: totalFirebaseTimeMs,
          charactersPerMs: textCharactersInMostRecentTurn / totalFirebaseTimeMs,
        })
      );
    }

    this.performanceTrace = [];
  }

  public getLoadState() {
    return this.loadState;
  }
  public getTurns() {
    return this.turns;
  }

  public sendMessage(agentId: AgentId, message: string, messageGenerationParams: MessageGenerationParams) {
    // TODO: Optimistically update with the new message.

    this.performanceTrace = [];
    this.addPerfCheckpoint('send-message');
    this.lastGeneratedTurnId = this.turns.at(-1)?.id;
    this.lastSeenMostRecentAgentTextMessage = '';
    return this.fixieClient.sendMessage(agentId, this.conversationId, {
      message,
      generationParams: messageGenerationParams,
    });
  }

  public regenerate(agentId: AgentId, fullMessageGenerationParams: MessageGenerationParams) {
    this.performanceTrace = [];
    this.addPerfCheckpoint('regenerate');
    this.lastGeneratedTurnId = this.turns.at(-1)?.id;
    this.lastSeenMostRecentAgentTextMessage = '';
    this.modelResponseRequested = 'regenerate';
    this.dispatchStateChangeEvent();
    const requestStart = this.fixieClient.regenerate(
      agentId,
      this.conversationId,
      this.getMostRecentAssistantTurn()!.id,
      fullMessageGenerationParams
    );
    requestStart
      .then((response) => response.text())
      .then(() => {
        this.modelResponseRequested = null;
        this.dispatchStateChangeEvent();
      });
    return requestStart;
  }

  public stop(agentId: AgentId) {
    this.lastSeenMostRecentAgentTextMessage = '';
    this.lastGeneratedTurnId = this.turns.at(-1)?.id;
    this.modelResponseRequested = 'stop';
    this.flushPerfTrace();
    this.addPerfCheckpoint('stop');
    const mostRecentAssistantTurn = this.getMostRecentAssistantTurn();
    if (mostRecentAssistantTurn) {
      this.lastAssistantMessagesAtStop = mostRecentAssistantTurn.messages;
    }
    this.dispatchStateChangeEvent();
    const requestStart = this.fixieClient.stopGeneration(agentId, this.conversationId, mostRecentAssistantTurn!.id);
    requestStart
      .then((response) => response.text())
      .then(() => {
        this.modelResponseRequested = null;
        this.dispatchStateChangeEvent();
      });
    return requestStart;
  }

  private getMostRecentAssistantTurn() {
    return _.findLast(this.turns, { role: 'assistant' }) as AssistantConversationTurn | undefined;
  }

  public getModelResponseInProgress() {
    if (this.modelResponseRequested === 'regenerate') {
      return true;
    }
    if (this.modelResponseRequested === 'stop') {
      return false;
    }
    return this.loadState === 'loaded' && this.getMostRecentAssistantTurn()?.state === 'in-progress';
  }
}

/**
 * A client that maintains a connection to the Fixie conversation API.
 */
// This may be of minimal value, and we should just consolidate into using FixieConversationClient directly. Maybe the
// methods on this class should just be static methods on FixieConversationClient.
export class FixieChatClient {
  private readonly conversationsRoot: ReturnType<typeof collection>;
  private readonly fixieClient: IsomorphicFixieClient;
  private conversations: Record<ConversationId, FixieConversationClient> = {};

  constructor(fixieAPIUrl = 'https://api.fixie.ai') {
    const firebaseApp = initializeApp(firebaseConfig);
    this.conversationsRoot = collection(getFirestore(firebaseApp), 'schemas/v0/conversations');
    this.fixieClient = IsomorphicFixieClient.CreateWithoutApiKey(fixieAPIUrl);
  }

  async createNewConversation(input: string, agentId: AgentId, fullMessageGenerationParams: MessageGenerationParams) {
    const conversationId = (await this.fixieClient.startConversation(agentId, fullMessageGenerationParams, input))
      .conversationId;

    const conversation = this.getConversation(conversationId);
    conversation.optimisticallyExists = true;
    return conversation;
  }

  getConversation(conversationId: ConversationId) {
    if (!(conversationId in this.conversations)) {
      this.conversations[conversationId] = new FixieConversationClient(
        conversationId,
        this.fixieClient,
        this.conversationsRoot
      );
    }
    return this.conversations[conversationId];
  }
}

/**
 * A map of Fixie API URLs to FixieChatClients.
 *
 * In practice, this will only ever have a single entry. But the useFixie hook takes a fixieAPIUrl argument, so if we don't
 * handle multiple possible values, it'll be a footgun.
 */
const fixieChatClients: Record<string, FixieChatClient> = {};

/**
 * @experimental this API may change at any time.
 *
 * This hook manages the state of a Fixie-hosted conversation.
 */
export function useFixie({
  conversationId: userPassedConversationId,
  conversationFixtures,
  onNewTokens,
  messageGenerationParams,
  logPerformanceTraces,
  agentId,
  fixieAPIUrl,
  onNewConversation,
}: UseFixieArgs): UseFixieResult {
  const fixieAPIUrlToUse = fixieAPIUrl ?? 'https://api.fixie.ai';
  if (!(fixieAPIUrlToUse in fixieChatClients)) {
    fixieChatClients[fixieAPIUrlToUse] = new FixieChatClient(fixieAPIUrl);
  }
  const fixieChatClient = fixieChatClients[fixieAPIUrlToUse];

  /**
   * In general, you're supposed to use setState for values that impact render, and ref for values that don't.
   * Because any value that gets returned from this hook may impact render, it seems like we'd want to use setState.
   * However, I've noticed some timing issues where, because setState is async, the value is not actually read when
   * we need it.
   *
   * For instance, if we manage a value X via setState, and on a hook invocation, we call setState(X + 1), all our
   * reads of X in this hook invocation will read the old value of X, not the new value.
   *
   * Thus, to manage state where we need the update to be reflected immediately, I've used refs. I'm not sure if
   * this is bad or there's something else I'm supposed to do in this situation.
   */

  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(userPassedConversationId);

  useEffect(() => {
    setConversationId(userPassedConversationId);
  }, [userPassedConversationId]);

  const [loadState, setLoadState] = useState<UseFixieResult['loadState']>('no-conversation-set');
  const [turns, setTurns] = useState<UseFixieResult['turns']>([]);
  const [modelResponseInProgress, setModelResponseInProgress] = useState(false);
  const [conversationExists, setConversationExists] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    function handleNewTokens(event: Event) {
      onNewTokens?.((event as NewTokensEvent).tokens);
    }
    function handlePerfLog(event: Event) {
      const perfLogEvent = event as PerfLogEvent;
      logPerformanceTraces?.(perfLogEvent.message, perfLogEvent.data);
    }

    let conversation: FixieConversationClient;

    function updateLocalStateFromConversation() {
      setLoadState(conversation.getLoadState());
      setTurns(conversation.getTurns());
      setModelResponseInProgress(conversation.getModelResponseInProgress());
      setConversationExists(conversation.exists());
    }
    if (conversationId) {
      conversation = fixieChatClient.getConversation(conversationId);
      conversation.addEventListener('newTokens', handleNewTokens);
      conversation.addEventListener('perfLog', handlePerfLog);

      updateLocalStateFromConversation();

      conversation.addStateChangeEventListener(updateLocalStateFromConversation);
    }

    return () => {
      if (conversationId) {
        const conversation = fixieChatClient.getConversation(conversationId);
        conversation.removeEventListener('newTokens', handleNewTokens);
        conversation.removeEventListener('perfLog', handlePerfLog);
        conversation.removeStateChangeEventListener(updateLocalStateFromConversation);
      }
    };
  }, [conversationId]);

  const fullMessageGenerationParams: MessageGenerationParams = {
    model: 'gpt-4-32k',
    modelProvider: 'openai',
    ...messageGenerationParams,
    userTimeZoneOffset: new Date().getTimezoneOffset(),
  };

  async function createNewConversation(overriddenInput?: string) {
    const conversation = await fixieChatClient.createNewConversation(
      overriddenInput ?? input,
      agentId,
      fullMessageGenerationParams
    );
    setConversationId(conversation.conversationId);
    onNewConversation?.(conversation.conversationId);
  }

  /**
   * If there's no conversation ID, we return noops for everything. This allows the caller of this hook to be largely
   * agnostic to whether a conversation actually exists. However, because hooks must be called unconditionally,
   * we have the awkwardness of needing to call all the hooks above this spot in the code.
   */
  if (!conversationId) {
    return {
      turns: conversationFixtures ?? turns,
      loadState,
      modelResponseInProgress,
      regenerate,
      stop,
      sendMessage: createNewConversation,
      error: undefined,
      input,
      setInput,
    };
  }

  const conversation = fixieChatClient.getConversation(conversationId);

  function sendMessage(message?: string) {
    if (!conversationId) {
      return Promise.resolve();
    }
    return conversation.sendMessage(agentId, message ?? input, fullMessageGenerationParams);
  }

  // if (modelResponseRequested === 'regenerate' && mostRecentAssistantTurn) {
  //   mostRecentAssistantTurn.messages = [];
  // }
  // /**
  //  * This strategy means that if the UI will optimistically update to stop the stream. However, once the user
  //  * refreshes, they'll see more content when the client discards the local `lastAssistantMessagesAtStop` state
  //  * and instead reads from Firebase.
  //  */
  // turns.forEach((turn) => {
  //   // The types are wrong here.
  //   // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  //   if (lastAssistantMessagesAtStop[turn.id]) {
  //     turn.messages = lastAssistantMessagesAtStop[turn.id];
  //   }
  // });

  function regenerate() {
    if (!conversationId) {
      return Promise.resolve();
    }
    return conversation.regenerate(agentId, fullMessageGenerationParams);
  }

  function stop() {
    if (!conversationId) {
      return Promise.resolve();
    }
    return conversation.stop(agentId);
  }

  return {
    turns: conversationFixtures ?? turns,
    loadState,
    input,
    error: undefined,
    stop,
    regenerate,
    modelResponseInProgress,
    setInput,
    sendMessage,
    conversationExists,
  };
}
