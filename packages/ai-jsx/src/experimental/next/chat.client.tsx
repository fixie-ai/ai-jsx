/** @jsxImportSource ai-jsx/react */
'use client';
import React, { ReactNode, useContext, createContext } from 'react';
import { JSX } from 'ai-jsx/react/jsx-runtime';

export interface UIMessage {
  type: 'assistant' | 'user';
  message: ReactNode;
}

export type SendMessage<T> = (formData: FormData, context: T | undefined) => Promise<[UIMessage[], Promise<T>]>;

export const ConversationContext = createContext([] as UIMessage[]);
export const StatusContext = createContext<'idle' | 'pending' | 'streaming'>('idle');
export const MessageContext = createContext(null as ReactNode);

export function Chat<T>({
  children,
  onSend,
  initialContext,
}: {
  children: ReactNode;
  initialContext?: T;
  onSend: SendMessage<T>;
}) {
  const [requestContext, setRequestContext] = React.useState(initialContext);
  const [conversation, setConversation] = React.useState([] as UIMessage[]);
  const [key, setKey] = React.useState(0); // Used to reset the form after each send.
  const [status, setStatus] = React.useState<'idle' | 'pending' | 'streaming'>('idle');

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
                const [stream, nextContext] = await onSend(formData, requestContext);
                setStatus('streaming');
                setConversation((existing) => existing.concat(stream));
                setKey((k) => k + 1);
                setRequestContext(await nextContext);
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

export function Message() {
  return useContext(MessageContext);
}
