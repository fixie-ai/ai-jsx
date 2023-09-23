import { getFirestore, collection, doc, query, orderBy, FirestoreError } from 'firebase/firestore';
import { useCollectionData as typedUseCollectionData } from 'react-firebase-hooks/firestore';
// @ts-expect-error
import { useCollectionData as untypedUseCollectionData } from 'react-firebase-hooks/firestore/dist/index.esm.js';
import { initializeApp } from 'firebase/app';

import { useState, SetStateAction, Dispatch, useRef, useEffect } from 'react';
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

// This is whacky. I did it because Webpack from Fixie Frame threw an error
// when trying to build this file. (Vite from Redwood worked fine.)
const useCollectionData = untypedUseCollectionData as typeof typedUseCollectionData;

export interface UseSidekickResult {
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
  regenerate: () => Promise<void>;

  /**
   * Request a stop of the current model response.
   *
   * The model will stop generation after it gets the request, but you may see a few more
   * tokens stream in before that happens.
   */
  stop: () => Promise<void>;

  /**
   * Append `message` to the conversation. This does not change `input`.
   *
   * If you omit `message`, the current value of `input` will be used instead.
   *
   */
  sendMessage: (message?: string) => Promise<void>;

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

export interface UseSidekickArgs {
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

/**
 * @experimental this API may change at any time.
 *
 * This hook manages the state of a Fixie-hosted conversation.
 */
export function useSidekick({
  conversationId: userPassedConversationId,
  conversationFixtures,
  onNewTokens,
  messageGenerationParams,
  logPerformanceTraces,
  agentId,
  fixieAPIUrl,
  onNewConversation,
}: UseSidekickArgs): UseSidekickResult {
  /**
   * Aspects of the useSidekick hook may be hideously more complicated than they need to be.
   */

  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(userPassedConversationId);

  function handleNewConversationId(conversationId: ConversationId) {
    setConversationId(conversationId);
    onNewConversation?.(conversationId);
  }

  useEffect(() => {
    setConversationId(userPassedConversationId);
  }, [userPassedConversationId]);

  // I think using `data` as a var name is fine here.
  /* eslint-disable id-blacklist */
  const performanceTrace = useRef<{ name: string; timeMs: number; data?: Jsonifiable }[]>([]);
  const lastGeneratedTurnId = useRef<ConversationTurn['id'] | undefined>(undefined);
  const lastTurnForWhichHandleNewTokensWasCalled = useRef<ConversationTurn['id'] | undefined>(undefined);

  function addPerfCheckpoint(name: string, data?: Jsonifiable) {
    performanceTrace.current.push({ name, timeMs: performance.now(), data });
  }
  /* eslint-enable id-blacklist */

  /**
   * We do state management for optimistic UI.
   *
   * For stop/regenerate, if we simply request a stop/regenerate, the UI won't update until Fixie Frame updates
   * Firebase and that update is seen by the client. Instead, we'd rather optimistically update.This requires managing
   * an intermediate layer of state.
   */

  type ModelRequestedState = 'stop' | 'regenerate' | null;
  const [modelResponseRequested, setModelResponseRequested] = useState<ModelRequestedState>(null);
  const [lastAssistantMessagesAtStop, setLastAssistantMessagesAtStop] = useState<
    Record<ConversationTurn['id'], ConversationTurn['messages']>
  >({});

  const fullMessageGenerationParams: MessageGenerationParams = {
    model: 'gpt-4-32k',
    modelProvider: 'openai',
    ...messageGenerationParams,
    userTimeZoneOffset: new Date().getTimezoneOffset(),
  };

  const firebaseApp = initializeApp(firebaseConfig);

  const conversationsRoot = collection(getFirestore(firebaseApp), 'schemas/v0/conversations');
  const conversation = doc(conversationsRoot, conversationId ?? 'fake-id');
  const turnCollection = collection(conversation, 'turns');

  // If we try this, we get:
  //
  // Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.
  //
  // .withConverter({
  //   toFirestore: _.identity,
  //   fromFirestore: (snapshot, options) => {
  //     const data = snapshot.data(options)
  //     return {
  //       ...data,
  //       id: snapshot.id,
  //     }
  //   }
  // });
  const turnsQuery = query(turnCollection, orderBy('timestamp', 'asc'));
  const [value, loading, error, snapshot] = useCollectionData<ConversationTurn>(
    // This rightly complains that we aren't using .withConverter,
    // but we hack around it below by manually updating messages.
    // @ts-expect-error
    turnsQuery
  );

  // We don't need the API key to access the conversation API.
  const fixieClient = IsomorphicFixieClient.CreateWithoutApiKey(fixieAPIUrl ?? 'https://api.fixie.ai');

  const lastSeenMostRecentAgentTextMessage = useRef('');
  async function createNewConversation() {
    const conversationId = (await fixieClient.startConversation(agentId, fullMessageGenerationParams, input))
      .conversationId;
    handleNewConversationId(conversationId);
  }

  /**
   * If there's no conversation ID, we return noops for everything. This allows the caller of this hook to be largely
   * agnostic to whether a conversation actually exists. However, because hooks must be called unconditionally,
   * we have the awkwardness of needing to call all the hooks above this spot in the code.
   */
  if (!conversationId) {
    return {
      turns: [],
      loadState: 'no-conversation-set',
      modelResponseInProgress: false,
      regenerate,
      stop,
      sendMessage: createNewConversation,
      error: undefined,
      input,
      setInput,
    };
  }

  const loadState = (loading ? 'loading' : error ? error : 'loaded') as UseSidekickResult['loadState'];
  const turns = conversationFixtures ?? value ?? [];

  /**
   * The right way to do this is to use with `withConverter` method, but when I enabled
   * that, I had other problems.
   */
  if (loadState === 'loaded' && !conversationFixtures) {
    snapshot?.docs.forEach((doc, index) => {
      turns![index].id = doc.id;
    });
  }

  const mostRecentAssistantTurn = _.findLast(turns, { role: 'assistant' }) as AssistantConversationTurn | undefined;

  snapshot?.docChanges().forEach((change) => {
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
        if (['in-progress', 'done'].includes(turn.state) && modelResponseRequested !== 'stop') {
          const lastMessageFromAgent = lastSeenMostRecentAgentTextMessage.current;
          const mostRecentAssistantTextMessage = _.findLast(turn.messages, {
            kind: 'text',
          }) as TextMessage | undefined;
          if (mostRecentAssistantTextMessage) {
            const messageIsContinuation =
              lastMessageFromAgent && mostRecentAssistantTextMessage.content.startsWith(lastMessageFromAgent);
            const newMessagePart = messageIsContinuation
              ? mostRecentAssistantTextMessage.content.slice(lastMessageFromAgent.length)
              : mostRecentAssistantTextMessage.content;

            if (!messageIsContinuation && lastTurnForWhichHandleNewTokensWasCalled.current === turn.id) {
              return;
            }

            lastSeenMostRecentAgentTextMessage.current = mostRecentAssistantTextMessage.content;

            if (newMessagePart) {
              lastTurnForWhichHandleNewTokensWasCalled.current = turn.id;
              addPerfCheckpoint('chat:delta:text', { newText: newMessagePart });
              onNewTokens?.(newMessagePart);
            }
          }
        }
      }
    }
  });

  function flushPerfTrace() {
    if (!performanceTrace.current.length) {
      return;
    }

    const latestTurnId = turns.at(-1)?.id;
    /**
     * It would be nice to include function calls here too, but we can do that later.
     */
    const textCharactersInMostRecentTurn = _.sumBy(turns.at(-1)?.messages, (message) => {
      switch (message.kind) {
        case 'text':
          return message.content.length;
        case 'functionCall':
        case 'functionResponse':
          return 0;
      }
    });

    const commonData = { latestTurnId, textCharactersInMostRecentTurn };

    const firstPerfTrace = performanceTrace.current[0].timeMs;
    const firstFirebaseDelta = _.find(performanceTrace.current, {
      name: 'chat:delta:text',
    })?.timeMs;
    const lastFirebaseDelta = _.findLast(performanceTrace.current, {
      name: 'chat:delta:text',
    })?.timeMs;

    logPerformanceTraces?.('[DD] All traces', {
      traces: performanceTrace.current,
      ...commonData,
    });
    if (firstFirebaseDelta) {
      logPerformanceTraces?.('[DD] Time to first Firebase delta', {
        ...commonData,
        timeMs: firstFirebaseDelta - firstPerfTrace,
      });
      const totalFirebaseTimeMs = lastFirebaseDelta! - firstPerfTrace;
      logPerformanceTraces?.('[DD] Time to last Firebase delta', {
        ...commonData,
        timeMs: totalFirebaseTimeMs,
        charactersPerMs: textCharactersInMostRecentTurn / totalFirebaseTimeMs,
      });
    }

    performanceTrace.current = [];
  }

  if (
    snapshot?.docChanges().length &&
    turns.every(({ state }) => state === 'done' || state === 'stopped' || state === 'error') &&
    performanceTrace.current.length &&
    turns.at(-1)?.id !== lastGeneratedTurnId.current
  ) {
    // I'm not sure if this is at all valuable.
    addPerfCheckpoint('all-turns-done-or-stopped-or-errored');
    flushPerfTrace();
  }

  async function sendMessage(message?: string) {
    if (!conversationId) {
      return;
    }
    performanceTrace.current = [];
    addPerfCheckpoint('send-message');
    lastGeneratedTurnId.current = turns.at(-1)?.id;
    lastSeenMostRecentAgentTextMessage.current = '';
    await fixieClient.sendMessage(agentId, conversationId, {
      message: message ?? input,
      generationParams: fullMessageGenerationParams,
    });
  }

  if (modelResponseRequested === 'regenerate' && mostRecentAssistantTurn) {
    mostRecentAssistantTurn.messages = [];
  }
  /**
   * This strategy means that if the UI will optimistically update to stop the stream. However, once the user
   * refreshes, they'll see more content when the client discards the local `lastAssistantMessagesAtStop` state
   * and instead reads from Firebase.
   */
  turns.forEach((turn) => {
    // The types are wrong here.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (lastAssistantMessagesAtStop[turn.id]) {
      turn.messages = lastAssistantMessagesAtStop[turn.id];
    }
  });

  async function regenerate() {
    if (!conversationId) {
      return;
    }
    performanceTrace.current = [];
    addPerfCheckpoint('regenerate');
    lastGeneratedTurnId.current = turns.at(-1)?.id;
    lastSeenMostRecentAgentTextMessage.current = '';
    setModelResponseRequested('regenerate');
    await fixieClient.regenerate(agentId, conversationId, mostRecentAssistantTurn!.id, fullMessageGenerationParams);
    setModelResponseRequested(null);
  }

  async function stop() {
    if (!conversationId) {
      return;
    }
    lastSeenMostRecentAgentTextMessage.current = '';
    lastGeneratedTurnId.current = turns.at(-1)?.id;
    setModelResponseRequested('stop');
    flushPerfTrace();
    addPerfCheckpoint('stop');
    if (mostRecentAssistantTurn) {
      setLastAssistantMessagesAtStop((prev) => ({
        ...prev,
        [mostRecentAssistantTurn!.id]: mostRecentAssistantTurn.messages,
      }));
    }
    await fixieClient.stopGeneration(agentId, conversationId, mostRecentAssistantTurn!.id);
    setModelResponseRequested(null);
  }

  function getModelResponseInProgress() {
    if (modelResponseRequested === 'regenerate') {
      return true;
    }
    if (modelResponseRequested === 'stop') {
      return false;
    }
    return loadState === 'loaded' && mostRecentAssistantTurn?.state === 'in-progress';
  }

  return {
    turns,
    loadState,
    input,
    error,
    stop,
    regenerate,
    modelResponseInProgress: getModelResponseInProgress(),
    setInput,
    sendMessage,
    conversationExists: snapshot ? !snapshot.empty : undefined,
  };
}
