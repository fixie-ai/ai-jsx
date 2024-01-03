import { useState, SetStateAction, Dispatch, useEffect, useRef } from 'react';
import { AgentId, AssistantConversationTurn, TextMessage, ConversationId, Conversation } from './types.js';
import { FixieClient } from './client.js';

/**
 * The result of the useFixie hook.
 */
export interface UseFixieResult {
  /**
   * The conversation that is currently being managed.
   */
  conversation: Conversation | undefined;

  /**
   * A value that indicates whether the initial conversation (if any) has loaded.
   * This is _not_ an indicator of whether the LLM is currently generating a response.
   */
  loadState: 'loading' | 'loaded' | 'error';

  /**
   * Regenerate the most recent model response. Only has an effect if the most recent response is not in progress.
   *
   * Returns true if the most recent response was not in progress, false otherwise.
   */
  regenerate: () => boolean;

  /**
   * Request a stop of the current model response. Only has an effect if the most recent response is in progress.
   *
   * Returns true if the most recent response was in progress, false otherwise.
   */
  stop: () => boolean;

  /**
   * Append `message` to the conversation. Only sends a message if the model is not currently generating a response.
   *
   * Returns true if the message was sent, false otherwise.
   */
  sendMessage: (message?: string) => boolean;

  /**
   * Starts a new conversation.
   */
  newConversation: () => void;

  /**
   * If the loadState is `"error"`, contains additional details about the error.
   */
  error: any;
}

/**
 * Arguments passed to the useFixie hook.
 */
export interface UseFixieArgs {
  /**
   * The agent UUID to use.
   */
  agentId: AgentId;

  /**
   * The ID of the conversation to use.
   */
  conversationId?: ConversationId;

  /**
   * If true, the agent will send the first message in conversations.
   */
  agentStartsConversation?: boolean;

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
   * A function that will be called whenever the conversation ID changes.
   */
  onNewConversation?: (conversationId?: ConversationId) => void;

  /**
   * An optional URL to use for the Fixie API instead of the default.
   */
  fixieApiUrl?: string;
}

/**
 * A hook that fires the `onNewTokens` callback whenever text is generated.
 */
function useTokenNotifications(conversation: Conversation | undefined, onNewTokens: UseFixieArgs['onNewTokens']) {
  const conversationRef = useRef<Conversation | undefined>(conversation);

  useEffect(() => {
    if (
      !conversation ||
      !onNewTokens ||
      !conversationRef.current ||
      conversation === conversationRef.current ||
      conversationRef.current.id !== conversation.id
    ) {
      // Only fire notifications when we observe a change within the same conversation.
      conversationRef.current = conversation;
      return;
    }

    const lastTurn = conversation.turns.at(-1);
    if (!lastTurn || lastTurn.role !== 'assistant') {
      conversationRef.current = conversation;
      return;
    }

    const lastTurnText = lastTurn.messages
      .filter((m) => m.kind === 'text')
      .map((m) => (m as TextMessage).content)
      .join('');

    const previousLastTurn = conversationRef.current.turns.at(-1);
    const previousLastTurnText =
      previousLastTurn?.id !== lastTurn.id
        ? ''
        : previousLastTurn.messages
            .filter((m) => m.kind === 'text')
            .map((m) => (m as TextMessage).content)
            .join('');

    // Find the longest matching prefix.
    let i = 0;
    while (i < lastTurnText.length && i < previousLastTurnText.length && lastTurnText[i] === previousLastTurnText[i]) {
      i++;
    }
    const newTokens = lastTurnText.slice(i);
    if (newTokens.length > 0) {
      onNewTokens(newTokens);
    }
    conversationRef.current = conversation;
  }, [conversation, onNewTokens]);
}

/**
 * A hook that fires the `onNewConversation` callback whenever the conversation ID changes.
 */
function useNewConversationNotfications(
  conversation: Conversation | undefined,
  onNewConversation: UseFixieArgs['onNewConversation']
) {
  const conversationIdRef = useRef(conversation?.id);

  useEffect(() => {
    if (conversation?.id !== conversationIdRef.current) {
      onNewConversation?.(conversation?.id);
    }
    conversationIdRef.current = conversation?.id;
  }, [conversation, onNewConversation]);
}

/**
 * A hook that polls the Fixie API for updates to the conversation.
 */
function useConversationPoller(
  fixieApiUrl: string | undefined,
  agentId: string,
  conversation: Conversation | undefined,
  setConversation: Dispatch<SetStateAction<Conversation | undefined>>,
  isStreamingFromApi: boolean
) {
  const conversationId = conversation?.id;
  const anyTurnInProgress = Boolean(conversation?.turns.find((t) => t.state === 'in-progress'));
  const [isVisible, setIsVisible] = useState(true);
  const delay = isVisible && anyTurnInProgress ? 100 : isVisible ? 1000 : 60000;

  useEffect(() => {
    function handleVisibilityChange() {
      setIsVisible(document.visibilityState === 'visible');
    }

    setIsVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (conversationId === undefined || isStreamingFromApi) {
      return;
    }

    let abandoned = false;
    let timeout: ReturnType<typeof setTimeout>;

    const updateConversation = () =>
      new FixieClient({ url: fixieApiUrl }).getConversation({ agentId, conversationId }).then((newConversation) => {
        setConversation((existing) => {
          if (
            abandoned ||
            !existing ||
            existing.id !== newConversation.id ||
            JSON.stringify(existing) === JSON.stringify(newConversation)
          ) {
            return existing;
          }

          return newConversation;
        });

        if (!abandoned) {
          timeout = setTimeout(updateConversation, delay);
        }
      });

    timeout = setTimeout(updateConversation, delay);
    return () => {
      abandoned = true;
      clearTimeout(timeout);
    };
  }, [fixieApiUrl, agentId, conversationId, setConversation, isStreamingFromApi, delay]);
}

/**
 * A hook that manages mutations to the conversation.
 */
function useConversationMutations(
  fixieApiUrl: string | undefined,
  agentId: string,
  conversation: Conversation | undefined,
  setConversation: Dispatch<SetStateAction<Conversation | undefined>>,
  onError: (type: 'newConversation' | 'send' | 'regenerate' | 'stop', error: any) => void
): {
  sendMessage: (message?: string) => boolean;
  regenerate: (messageId?: string) => boolean;
  stop: (messageId?: string) => boolean;
  isStreamingFromApi: boolean;
} {
  // Track in-progress requests.
  const nextRequestId = useRef(0);
  const [activeRequests, setActiveRequests] = useState<Record<number, boolean>>({});
  const startRequest = () => {
    const requestId = nextRequestId.current++;
    setActiveRequests((existing) => ({ ...existing, [requestId]: true }));
    return {
      requestId,
      endRequest: () => {
        setActiveRequests((existing) => {
          if (!(requestId in existing)) {
            return existing;
          }

          const { [requestId]: _, ...rest } = existing;
          return rest;
        });
      },
    };
  };

  // If stop/regenerate are triggered referencing an optimistic ID, we'll queue them up and handle them when the
  // optimistic ID can resolve to the real one.
  const [localIdMap, setLocalIdMap] = useState<Record<string, string>>({});
  const [pendingRequests, setPendingRequests] = useState<
    { type: 'stop' | 'regenerate'; conversationId: string; localMessageId: string }[]
  >([]);
  const setLocalId = (localId: string, remoteId: string) => {
    setLocalIdMap((existing) => (localId in existing ? existing : { ...existing, [localId]: remoteId }));
  };
  useEffect(() => {
    if (pendingRequests.length === 0) {
      return;
    }

    const nextPendingRequest = pendingRequests[0];
    if (nextPendingRequest.conversationId !== conversation?.id) {
      setPendingRequests((existing) => existing.slice(1));
      return;
    }

    if (nextPendingRequest.localMessageId in localIdMap) {
      const action = nextPendingRequest.type === 'regenerate' ? regenerate : stop;
      action(localIdMap[nextPendingRequest.localMessageId]);
      setPendingRequests((existing) => existing.slice(1));
    }
  }, [pendingRequests, localIdMap, conversation?.id, regenerate, stop]);

  const client = new FixieClient({ url: fixieApiUrl });

  async function handleTurnStream(
    stream: ReadableStream<AssistantConversationTurn>,
    optimisticUserTurnId: string,
    optimisticAssistantTurnId: string,
    endRequest: () => void
  ) {
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      setLocalId(optimisticAssistantTurnId, value.id);
      if (value.inReplyToId) {
        setLocalId(optimisticUserTurnId, value.inReplyToId);
      }

      setConversation((existingConversation) => {
        // If the conversation ID has changed in the meantime, ignore it.
        if (!existingConversation || !conversation || existingConversation.id !== conversation.id) {
          endRequest();
          return existingConversation;
        }

        return {
          ...existingConversation,
          turns: existingConversation.turns.map((t) => {
            if (
              (t.id === value.id || t.id === optimisticAssistantTurnId) &&
              (t.state === 'in-progress' || value.state !== 'in-progress')
            ) {
              return value;
            }

            if (t.id === optimisticUserTurnId && value.inReplyToId) {
              // We have the actual ID now.
              return {
                ...t,
                id: value.inReplyToId,
              };
            }

            return t;
          }),
        };
      });
    }
  }

  function sendMessage(message?: string) {
    if (!conversation) {
      // Start a new conversation.
      const { endRequest } = startRequest();
      client
        .startConversation({ agentId, message })
        .then(async (newConversationStream) => {
          const reader = newConversationStream.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            // If the conversation ID has changed in the meantime, ignore the update.
            setConversation((existing) => {
              if (existing && existing.id !== value.id) {
                endRequest();
                return existing;
              }
              return value;
            });
          }
        })
        .catch((e) => onError('newConversation', e))
        .finally(endRequest);

      return true;
    }

    // Send a message to the existing conversation.
    if (conversation.turns.find((t) => t.state === 'in-progress')) {
      // Can't send a message if the model is already generating a response.
      return false;
    }

    if (message === undefined) {
      return false;
    }

    const { requestId, endRequest } = startRequest();
    const optimisticUserTurnId = `local-user-${requestId}`;
    const optimisticAssistantTurnId = `local-assistant-${requestId}`;
    client
      .sendMessage({ agentId, conversationId: conversation.id, message })
      .then((stream) => handleTurnStream(stream, optimisticUserTurnId, optimisticAssistantTurnId, endRequest))
      .catch((e) => onError('send', e))
      .finally(endRequest);

    setConversation((existingConversation) => {
      if (
        !existingConversation ||
        existingConversation.id !== conversation.id ||
        existingConversation.turns.find((t) => t.state === 'in-progress')
      ) {
        endRequest();
        return existingConversation;
      }

      // Do an optimistic update.
      return {
        ...existingConversation,
        turns: [
          ...existingConversation.turns,
          {
            id: optimisticUserTurnId,
            role: 'user',
            state: 'done',
            timestamp: new Date().toISOString(),
            messages: [{ kind: 'text', content: message }],
          },
          {
            id: optimisticAssistantTurnId,
            role: 'assistant',
            state: 'in-progress',
            timestamp: new Date().toISOString(),
            inReplyToId: optimisticUserTurnId,
            messages: [],
          },
        ],
      };
    });

    return true;
  }

  function regenerate(messageId: string | undefined = conversation?.turns.at(-1)?.id) {
    const lastTurn = conversation?.turns.at(-1);
    if (
      conversation === undefined ||
      lastTurn === undefined ||
      lastTurn.role !== 'assistant' ||
      lastTurn.state === 'in-progress' ||
      lastTurn.id !== messageId
    ) {
      return false;
    }

    if (lastTurn.id.startsWith('local-')) {
      setPendingRequests((existing) => [
        ...existing,
        { type: 'regenerate', conversationId: conversation.id, localMessageId: messageId },
      ]);
      return true;
    }

    const { requestId, endRequest } = startRequest();
    const optimisticUserTurnId = `local-user-${requestId}`;
    const optimisticAssistantTurnId = `local-assistant-${requestId}`;
    client
      .regenerate({ agentId, conversationId: conversation.id, messageId })
      .then((stream) => handleTurnStream(stream, optimisticUserTurnId, optimisticAssistantTurnId, endRequest))
      .catch((e) => onError('regenerate', e))
      .finally(endRequest);

    // Do an optimistic update.
    setConversation((existingConversation) => {
      const lastTurn = existingConversation?.turns.at(-1);
      if (
        !existingConversation ||
        existingConversation.id !== conversation.id ||
        existingConversation.turns.length === 0 ||
        !lastTurn ||
        lastTurn.role !== 'assistant' ||
        lastTurn.id !== messageId
      ) {
        endRequest();
        return existingConversation;
      }

      return {
        ...existingConversation,
        turns: [
          ...existingConversation.turns.slice(0, -1),
          {
            id: optimisticAssistantTurnId,
            role: 'assistant',
            state: 'in-progress',
            timestamp: new Date().toISOString(),
            inReplyToId: lastTurn.inReplyToId,
            messages: [],
          },
        ],
      };
    });

    return true;
  }

  function stop(messageId: string | undefined = conversation?.turns.at(-1)?.id) {
    const lastTurn = conversation?.turns.at(-1);
    if (
      conversation === undefined ||
      lastTurn === undefined ||
      lastTurn.state !== 'in-progress' ||
      lastTurn.id !== messageId
    ) {
      return false;
    }

    if (lastTurn.id.startsWith('local-')) {
      setPendingRequests((existing) => [
        ...existing,
        { type: 'stop', conversationId: conversation.id, localMessageId: messageId },
      ]);
      return true;
    }

    const { endRequest } = startRequest();
    client
      .stopGeneration({ agentId, conversationId: conversation.id, messageId: lastTurn.id })
      .catch((e) => onError('stop', e))
      .finally(endRequest);

    setConversation((existingConversation) => {
      if (existingConversation?.id !== conversation.id || existingConversation.turns.at(-1)?.id !== messageId) {
        endRequest();
        return existingConversation;
      }

      return {
        ...existingConversation,
        turns: existingConversation.turns.map((t) =>
          t.id === lastTurn.id && t.state === 'in-progress' ? { ...t, state: 'stopped' } : t
        ),
      };
    });

    return true;
  }

  return {
    isStreamingFromApi: Object.keys(activeRequests).length > 0,
    sendMessage,
    regenerate,
    stop,
  };
}

/**
 * @experimental this API may change at any time.
 *
 * This hook manages the state of a Fixie-hosted conversation.
 */
export function useFixie({
  conversationId: userProvidedConversationId,
  onNewTokens,
  agentId,
  fixieApiUrl: fixieAPIUrl,
  onNewConversation,
  agentStartsConversation,
}: UseFixieArgs): UseFixieResult {
  const [loadState, setLoadState] = useState<UseFixieResult['loadState']>('loading');
  const [loadError, setLoadError] = useState<UseFixieResult['error']>(undefined);
  const [conversation, setConversation] = useState<Conversation>();

  function reset() {
    setLoadState('loading');
    setLoadError(undefined);
    setConversation(undefined);
  }

  // If the agent ID changes, reset everything.
  useEffect(() => reset(), [agentId, fixieAPIUrl]);

  const { sendMessage, regenerate, stop, isStreamingFromApi } = useConversationMutations(
    fixieAPIUrl,
    agentId,
    conversation,
    setConversation,
    (type, e) => {
      if (type === 'newConversation') {
        setLoadState('error');
        setLoadError(e);
      }
    }
  );

  useConversationPoller(fixieAPIUrl, agentId, conversation, setConversation, isStreamingFromApi);
  useTokenNotifications(conversation, onNewTokens);
  useNewConversationNotfications(conversation, onNewConversation);

  // Do the initial load if the user passed a conversation ID.
  useEffect(() => {
    if (loadState === 'error') {
      return;
    }
    if (!userProvidedConversationId || userProvidedConversationId === conversation?.id) {
      setLoadState('loaded');
      return;
    }

    let abandoned = false;
    setLoadState('loading');
    new FixieClient({ url: fixieAPIUrl })
      .getConversation({ agentId, conversationId: userProvidedConversationId })
      .then((conversation) => {
        if (!abandoned) {
          onNewConversation?.(conversation.id);
          setConversation(conversation);
          setLoadState('loaded');
        }
      })
      .catch((error) => {
        if (!abandoned) {
          setLoadState('error');
          setLoadError(error);
        }
      });

    return () => {
      abandoned = true;
    };
  }, [fixieAPIUrl, agentId, userProvidedConversationId, conversation?.id, loadState]);

  // If the agent should start the conversation, do it.
  useEffect(() => {
    if (agentStartsConversation && loadState === 'loaded' && conversation === undefined && !isStreamingFromApi) {
      sendMessage();
    }
  }, [agentStartsConversation, loadState, conversation === undefined, isStreamingFromApi, sendMessage]);

  return {
    conversation,
    loadState,
    error: loadError,
    stop,
    regenerate,
    sendMessage,
    newConversation: reset,
  };
}
