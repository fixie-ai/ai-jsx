/** @jsxImportSource ai-jsx/react */
'use client';
import React, { ReactNode, useContext, createContext } from 'react';
import { JSX } from 'ai-jsx/react/jsx-runtime';

/**
 * UI that represents the contents of a message.
 */
export interface UIMessage {
  type: 'assistant' | 'user';
  message: ReactNode;
}

/**
 * A Server Action that processes a message and returns the resulting UI and context for the next message.
 * See the `sendChatMessage` helper in `ai-jsx/experimental/next/chat`.
 *
 * @see https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions
 */
export type SendChatMessage<T> = (
  formData: FormData,
  context: T | undefined
) => Promise<{ messages: UIMessage[]; context: Promise<T> }>;

/**
 * React Context containing the `UIMessage`s associated with a conversation. You probably don't want to use this directly, and
 * should use the `<Conversation>` component instead.
 */
export const ConversationContext = createContext([] as UIMessage[]);

const MessageContext = createContext(null as ReactNode);

/**
 * The current status of the <Chat> form.
 */
export type ChatStatus = 'idle' | 'pending' | 'streaming';

/**
 * React Context containing the form status. Typically consumed indirectly via the `<ChatState>` component.
 */
export const StatusContext = createContext<ChatStatus>('idle');

/**
 * A component that produces a Chat UI driven by AI.JSX. The children will be rendered within a `<form>` that
 * uses Server Actions to handle new message. Messages are sent using an `<input type="submit"> component in
 * the children.
 */
export function Chat<T>({
  children,
  onSend,
  initialContext,
}: {
  children: ReactNode;
  initialContext?: T;
  onSend: SendChatMessage<T>;
}) {
  const [requestContext, setRequestContext] = React.useState(initialContext);
  const [conversation, setConversation] = React.useState([] as UIMessage[]);
  const [key, setKey] = React.useState(0); // Used to reset the form after each send.
  const [status, setStatus] = React.useState<ChatStatus>('idle');

  return (
    <ConversationContext.Provider value={conversation}>
      <StatusContext.Provider value={status}>
        {/* @ts-expect-error Experimental React */}
        <form
          key={key}
          {...{
            action: (formData: FormData): void => {
              if (status !== 'idle') {
                return;
              }

              setStatus('pending');
              (async function () {
                const { messages, context } = await onSend(formData, requestContext);
                setStatus('streaming');
                setConversation((existing) => existing.concat(messages));
                setKey((k) => k + 1);
                setRequestContext(await context);
                setStatus('idle');
              })();
            },
          }}
        >
          {children}
        </form>
      </StatusContext.Provider>
    </ConversationContext.Provider>
  );
}

/**
 * A component that when used within a `<Chat>` component can vary rendering according to the status.
 * It uses the following props:
 *     * `children`: rendered when the form is idle
 *     * `pending`: rendered when a response has not yet been received from the server
 *     * `streaming`: rendered when a server response is streaming in
 */
export function ChatState({
  pending,
  streaming,
  children,
}: {
  pending?: ReactNode;
  streaming?: ReactNode;
  children: ReactNode;
}) {
  const status = useContext(StatusContext);
  if (status === 'streaming') {
    return streaming ?? pending ?? children;
  }

  if (status === 'pending') {
    return pending ?? children;
  }

  return children;
}

export interface MessageMap {
  user?: JSX.Element;
  assistant?: JSX.Element;
}

/**
 * A component that will resolve to a single message in a conversation. Used as part of
 * the `children` prop of `<Conversation>`.
 */
export function Message() {
  return useContext(MessageContext);
}

/**
 * A component that will resolve to the conversation so far. The children prop defines
 * how each type of message will be presented.
 */
export function Conversation({ children }: { children?: MessageMap }) {
  const messages = useContext(ConversationContext);

  return messages.map((msg, i) => {
    const forType = children?.[msg.type] ?? <Message />;

    return (
      <MessageContext.Provider value={msg.message} key={i}>
        {forType}
      </MessageContext.Provider>
    );
  });
}
