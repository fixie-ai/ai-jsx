/** @jsxImportSource ai-jsx/react */
/* eslint-disable react/jsx-key */
import * as AI from 'ai-jsx/react';
import { useEffect, useRef } from 'react';
import { z } from 'zod';
import { AssistantMessage, ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { memo } from 'ai-jsx/core/memoize';
import { OpenAI } from 'ai-jsx/lib/openai';
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
  parts: ({ type: 'text'; content: string } | { type: 'ui'; content: z.infer<typeof Grid> })[];
}
export type ChatMessage = AssistantChat | UserChat | UserClick;

export const conversationAtom = atom<ChatMessage[]>([
  {
    type: 'user',
    action: 'chat',
    content:
      "Let's play a choose your own adventure game. Give me a few options, but also let me give freeform responses.",
  },
]);
export const modelCallInProgress = atom<boolean>(false);

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
          You are an assistant who can directly render UI to the user. You always follow directions. When you speak to
          the user, your message must follow these types: type Response = Line[] type Line = TextLine | UILine type
          TextLine = {'{'} type: 'text'; content: string {'}'}
          type UILine = {'{'} type: 'ui'; content: Grid {'}'}
          type Button = {'{'} id: string; text: string {'}'}; type Row = Button[]; type Grid = Row[]; Use TextLine to
          display text to the user. Use UILine to display UI to the user. When the user clicks a button, you'll receive
          a message telling you which they clicked. Use your ability to show buttons to help the user accomplish their
          goal. Don't make the user type out a whole response if they can just click a button instead. For example, if
          you the user a question with a finite set of choices, give them buttons to make those choices. Try to make the
          buttons include emoji, when possible. Respond only with JSON. Your entire response should be of type
          `Response`. Do not include anything outside of the `Response` object. Include a combination of `TextLine` and
          `UILine` objects in your response.
        </SystemMessage>
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

function AIComponent() {
  const [conversation, setConversation] = useAtom(conversationAtom);
  const [, setCallInProgress] = useAtom(modelCallInProgress);
  const isInProgressRef = useRef(false);

  const children = memo(<ButtonEnabledAgent conversation={conversation} />);
  const when = !conversation.length || _.last(conversation)?.type === 'user';

  const lastMessageType = _.last(conversation)?.type;

  useEffect(() => {
    if (isInProgressRef.current || !when) {
      return;
    }
    setCallInProgress(true);
    isInProgressRef.current = true;
    // I couldn't get streaming to work here and I don't know why.
    // Maybe because we're in the client and however Axios is doing it only works in Node?
    AI.createRenderContext()
      .render(children)
      .then((finalFrame) => {
        isInProgressRef.current = false;
        setCallInProgress(false);

        let parts: any;
        try {
          parts = JSON.parse(finalFrame);
        } catch (e) {
          console.log("Couldn't parse line:", finalFrame);
          parts = [{ type: 'text', content: 'Error: the model returned invalid JSON.' }];
        }

        try {
          // Sometimes the model doesn't follow the desired output format exactly.
          if (typeof parts.type === 'string' && (parts.type as string).toLowerCase() === 'response') {
            parts = parts.content;
          }
          if (!Array.isArray(parts)) {
            if (!Array.isArray(parts.content) && parts.content.type) {
              parts.content = [parts.content.content];
            } else {
              parts = [parts];
            }
          }

          if (parts) {
            setConversation((prev) => [
              ...prev,
              {
                type: 'assistant',
                parts,
                rawMessage: finalFrame,
              },
            ]);
          }
        } catch (e) {
          console.log('Error normalizing JSON from model:', e, parts);
        }
      });
  }, [children, lastMessageType, setCallInProgress, when, setConversation]);

  return null;
}

export function AIRoot() {
  return <AIComponent />;
}
