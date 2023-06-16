// @ts-nocheck
/** @jsx LLMx.createElement */
/** @jsxFrag LLMx.Fragment */
/* eslint-disable react/jsx-key */
import * as LLMx from 'ai-jsx';
import React, { useEffect, useRef } from 'react';
import { AssistantMessage, ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { memo } from 'ai-jsx/core/memoize';
import { atom, useAtom } from 'jotai';
import _ from 'lodash';

export class ChatMessage {
  type: string;
  content: string;
}

export const conversationAtom = atom<ChatMessage[]>([]);
export const modelCallInProgress = atom<boolean>(false);

function DocsAgent({ conversation }: { conversation: any[] }) {
  return (
      <ChatCompletion>
        <SystemMessage>
          You are an assistant who always responds to the user message with an annoying response.
        </SystemMessage>
        {conversation.map((chatMessage) => {
          return (chatMessage.type === 'assistant') ?
            <AssistantMessage>{chatMessage.content}</AssistantMessage> :
            <UserMessage>{chatMessage.content}</UserMessage>;
          })
        }
      </ChatCompletion>
  );
}

function AI() {
  const [conversation, setConversation] = useAtom(conversationAtom);
  const [, setCallInProgress] = useAtom(modelCallInProgress);
  const isInProgressRef = useRef(false);
  const children = memo(<DocsAgent conversation={conversation} />);
  const when = conversation.length && _.last(conversation).type === 'user';

  useEffect(() => {
    if (isInProgressRef.current || !when) {
      return;
    }
    setCallInProgress(true);
    isInProgressRef.current = true;
    // I couldn't get streaming to work here and I don't know why.
    // Maybe because we're in the client and however Axios is doing it only works in Node?
    LLMx.createRenderContext()
      .render(children)
      .then((finalFrame) => {
        isInProgressRef.current = false;
        setCallInProgress(false);
        setConversation((prev) => [
          ...prev,
          {
            type: 'assistant',
            content: finalFrame                
          },
        ]);
      });
  }, [children, setCallInProgress, when, setConversation]);

  return null;
}

export function AIRoot() {
  return React.createElement(AI, {});
}
