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
  type: 'user',
}
interface UserClick extends UserResponse {
  action: 'click',
  id: string;
}
interface UserChat extends BaseChatMessage {
  action: 'chat',
  content: string;
}
interface AssistantChat extends BaseChatMessage {
  type: 'assistant',
  parts: Array<{ type: 'text', content: string } | {type: 'ui', content: z.infer<typeof Grid>}>;
}
type AllChatMessages = AssistantChat | UserChat | UserClick;

export const conversationAtom = atom<AllChatMessages>([] as AllChatMessages[]);

// This needs better debouncing + only fire a new request when the user sends a message.

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
        <UserMessage>Let's play a game of chess</UserMessage>
        {conversation.map(({ type, content, action }) => {
          if (type === 'assissant') {
            return <AssistantMessage>{content}</AssistantMessage>;
          }
          return (
            <UserMessage>
              {action === 'click' ? <>The user clicked button: {content}</> : <>The user said: {content}</>}
            </UserMessage>
          );
        })}
      </ChatCompletion>
    </OpenAI>
  );
}

const sampleResponse = `TEXT: Sure! I'll set up the board. Please choose the color for your pieces.
UI: [{"id":"white_pieces", "text":"White"},{"id":"black_pieces", "text":"Black"}]`;

function useAI(children, dependencies, handleFinalResult, when: boolean) {
  const isInProgressRef = useRef(false);
  const [frame, setFrame] = useState('');

  // useEffect(() => {
  //   if (isInProgressRef.current || !when) {
  //     return;
  //   }
  //   isInProgressRef.current = true;
  //   LLMx.createRenderContext({
  //     logger: console.log,
  //   })
  //     .render(children, {
  //       map: (frame) => {
  //         // debugger
  //         setFrame(frame);
  //       },
  //     })
  //     .then((finalFrame) => {
  //       // debugger;
  //       if (finalFrame) {
  //         setFrame(finalFrame);
  //         handleFinalResult({
  //           type: 'assissant',
  //           content: finalFrame,
  //         });
  //       }
  //       isInProgressRef.current = false;
  //     });
  // }, [children, ...dependencies]);

  return sampleResponse;
}

function AI() {
  const [conversation, setConversation] = useAtom(conversationAtom);
  const children = memo(<ButtonEnabledAgent conversation={conversation} />);
  const frame = useAI(children, [_.last(conversation)?.type], finalResult => setConversation((prev) => [...prev, finalResult]), !conversation.length || _.last(conversation).type === 'user');

  // We need to show the entire history, not just the most recent AI response.
  // Also, we need to show selected buttons.
  return frame ? React.createElement(AIResponseToReact, { children: frame }, frame) : 'Loading...';
}

function AIResponseToReact({ children: input }: { children: string }) {
  const [conversation, setConversation] = useAtom(conversationAtom);

  const regex = /(TEXT|UI):\s*([\s\S]*?)(?=(?:\sTEXT:|\sUI:|$))/g;
  let match;
  const result = [];

  while ((match = regex.exec(input)) !== null) {
    result.push({ type: match[1], content: match[2].trim() });
  }

  const children = result.map(({ type, content }, index) => {
    if (type === 'TEXT') {
      return React.createElement(
        'p',
        {
          key: index,
        },
        content
      );
    }
    if (type === 'UI') {
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
      return React.createElement(
        'div',
        {
          key: index,
        },
        validatedGrid.map((row, index) => {
          return React.createElement(
            'div',
            {
              key: index,
            },
            row.map((button) => {
              return React.createElement(
                'button',
                {
                  onClick: () => {
                    setConversation((prev) => [
                      ...prev,
                      {
                        type: 'user',
                        action: 'click',
                        content: button.id,
                      },
                    ]);
                  },
                  key: button.id,
                },
                button.text
              );
            })
          );
        })
      );
    }
  });

  return React.createElement(React.Fragment, { children });
}

export function AIRoot() {
  return React.createElement(AI, {});
}
