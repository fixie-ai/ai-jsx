/** @jsxImportSource ai-jsx/react */
import 'server-only';
import { AssistantMessage, UserMessage } from '../../core/completion.js';
import {
  MessageMap,
  Message as ClientMessage,
  Conversation as ClientConversation,
  SendMessage,
} from './chat.client.js';
export { Chat, ChatState } from './chat.client.js';
import * as AI from './index.js';

const AIMessageContext = AI.createContext(null as AI.Node);
const AIConversationContext = AI.createContext([] as SerializedMessage[]);

/**
 * A serialized chat message.
 */
export interface SerializedMessage {
  type: 'user' | 'assistant';
  message: string;
}

/**
 * A component that will resolve to a single message in a conversation. Used as part of
 * the `children` prop of `<Conversation>`.
 */
export function Message(props: {}, maybeContext?: AI.ComponentContext) {
  if (maybeContext && 'render' in maybeContext) {
    return maybeContext.getContext(AIMessageContext);
  }

  return <ClientMessage />;
}

/**
 * A component that will resolve to the conversation so far. Can be used
 * within either AI.JSX or React. The children prop defines how each type
 * of message will be presented.
 *
 * By default in AI.JSX the conversation will resolve to a format that
 * can be provided to <ChatCompletion>.
 */
export function Conversation(
  {
    children,
  }: {
    children?: MessageMap;
  },
  maybeContext?: AI.ComponentContext
) {
  if (maybeContext && 'render' in maybeContext) {
    const serializedMessages = maybeContext.getContext(AIConversationContext);
    return serializedMessages.map((msg, i) => {
      const forType =
        children?.[msg.type] ??
        (msg.type === 'user' ? (
          <UserMessage>
            <Message />
          </UserMessage>
        ) : (
          <AssistantMessage>
            <Message />
          </AssistantMessage>
        ));

      return (
        <AIMessageContext.Provider value={msg.message} key={i}>
          {forType}
        </AIMessageContext.Provider>
      );
    });
  }
  return <ClientConversation>{children}</ClientConversation>;
}

/**
 * A function that can be used from a Server Action to send a message.
 * @param message The user message.
 * @param reply An AI.JSX node that will produce the reply, using the <Conversation> component.
 * @param conversation The serialized conversation.
 * @returns A value that can be returned from <Chat>'s `onSend` Server Action.
 */
export function sendMessage(
  message: string,
  reply: AI.Node,
  conversation?: SerializedMessage[]
): Awaited<ReturnType<SendMessage<SerializedMessage[]>>> {
  const conversationWithUser = (conversation ?? []).concat([{ type: 'user', message }]);

  let setFinalReply = (_: string) => {};
  const finalReplyPromise = new Promise<string>((resolve) => {
    setFinalReply = resolve;
  });

  return [
    [
      { type: 'user', message },
      {
        type: 'assistant',
        message: (
          <AI.JSX onComplete={setFinalReply}>
            <AIConversationContext.Provider value={conversationWithUser}>{reply}</AIConversationContext.Provider>
          </AI.JSX>
        ),
      },
    ],
    finalReplyPromise.then((finalReply) => conversationWithUser.concat([{ type: 'assistant', message: finalReply }])),
  ];
}
