// @ts-nocheck
/** @jsx LLMx.createElement */
/** @jsxFrag LLMx.Fragment */
import * as LLMx from '@fixieai/ai-jsx';
import React, { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { AssistantMessage, ChatCompletion, SystemMessage, UserMessage } from '@fixieai/ai-jsx/core/completion';
import { memo } from '@fixieai/ai-jsx/core/memoize';
import { OpenAI } from '@fixieai/ai-jsx/lib/openai';
import { atom, useAtom } from 'jotai';
import _ from 'lodash';

interface BaseChatMessage {
  type: string;
}
interface UserResponse {
  type: 'user';
}
interface UserClick extends UserResponse {
  action: 'click';
  id: string;
}
interface UserChat extends UserResponse {
  action: 'chat';
  content: string;
}
interface AssistantChat extends BaseChatMessage {
  type: 'assistant';
  rawMessage: string;
  parts: Array<{ type: 'text'; content: string } | { type: 'ui'; content: z.infer<typeof Grid> }>;
}
export type ChatMessage = AssistantChat | UserChat | UserClick;

export const conversationAtom = atom<ChatMessage[]>([]);

const Button = z.object({
  id: z.string(),
  text: z.string(),
});

const Row = z.array(Button);

const Grid = z.array(Row);
function ButtonEnabledAgent({ conversation }: { conversation: any[] }) {
  return (
    <OpenAI chatModel="gpt-4">
      <ChatCompletion>
        <SystemMessage>
          You are an assistant who can directly render UI to the user. When you speak to the user, your message must
          follow this grammar: Split your response into logical chunks. Each chunk must start with either `TEXT:` or
          `UI:` If the line starts with `TEXT:`, the rest of the line is plain text that will be displayed to the user.
          If the line starts with `UI:`, the rest of the line is a JSON object representing UI that will be shown to the
          user. This object should be of type `Grid`: type Button = {'{'} id: string; text: string {'}'}; type Row =
          Button[]; type Grid = Row[]; . This gives you the ability to display a grid of buttons to the user. When the
          user clicks a button, you'll receive a message telling you which they clicked. Use your ability to show
          buttons to help the user accomplish their goal. Don't make the user type out a whole response if they can just
          click a button instead. For example, if you the user a question with a finite set of choices, give them
          buttons to make those choices.
        </SystemMessage>
        <UserMessage>Let's play tic tac toe</UserMessage>
        {conversation.map((chatMessage) => {
          if (chatMessage.type === 'assistant') {
            return <AssistantMessage>{chatMessage.rawMessage}</AssistantMessage>;
          }
          return (
            <UserMessage>
              {chatMessage.action === 'click' ? (
                <>The user clicked button: {chatMessage.id}</>
              ) : (
                <>The user said: {chatMessage.content}</>
              )}
            </UserMessage>
          );
        })}
      </ChatCompletion>
    </OpenAI>
  );
}

function AI() {
  const [conversation, setConversation] = useAtom(conversationAtom);
  const isInProgressRef = useRef(false);

  const children = memo(<ButtonEnabledAgent conversation={conversation} />);
  const when = !conversation.length || _.last(conversation).type === 'user';

  function parseAIResponse(aiResponse: string) {
    const regex = /(TEXT|UI):\s*([\s\S]*?)(?=(?:\sTEXT:|\sUI:|$))/g;
    let match;
    const result: AssistantChat['parts'] = [];

    while ((match = regex.exec(aiResponse)) !== null) {
      const type = match[1].toLowerCase() as 'text' | 'ui';
      const content = match[2].trim();
      if (type === 'text') {
        result.push({ type, content });
      } else {
        let grid;
        try {
          grid = JSON.parse(content);
        } catch {
          // In this case, the UI part hasn't finished streaming yet, so we ignore it until it's done.
          return null;
        }
        if (grid.type === 'Grid') {
          grid = grid.value || grid.content;
        }
        if (Array.isArray(grid) && !Array.isArray(grid[0])) {
          grid = [grid];
        }
        const validatedGrid = grid as z.infer<typeof Grid>;
        console.log('got UI response', validatedGrid);

        result.push({ type, content: grid, rawMessage: content });
      }
    }

    setConversation((prev) => [
      ...prev,
      {
        type: 'assistant',
        parts: result,
      },
    ]);
  }

  useEffect(() => {
    if (isInProgressRef.current || !when) {
      return;
    }
    isInProgressRef.current = true;
    LLMx.createRenderContext({
      logger: console.log,
    })
      .render(children)
      .then((finalFrame) => {
        parseAIResponse(finalFrame);
        isInProgressRef.current = false;
      });
  }, [children, _.last(conversation)?.type]);

  return null;
}

export function AIRoot() {
  return React.createElement(AI, {});
}
