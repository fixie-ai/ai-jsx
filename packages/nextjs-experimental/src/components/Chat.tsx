'use client';
import React, { useState, ReactNode, Suspense, useContext, createContext } from 'react';

export function User({ children }: { children: ReactNode }) {
  return <li className="whitespace-pre-line">👤: {children}</li>;
}

export function Assistant({ children }: { children: ReactNode }) {
  return (
    <li className="whitespace-pre-line">
      🤖: <Suspense fallback="_">{children}</Suspense>
    </li>
  );
}

export type SendMessage<T> = (formData: FormData, context: T) => Promise<[ReactNode[], Promise<T>]>;

const ConversationContext = createContext([] as ReactNode[]);
const StatusContext = createContext<'idle' | 'pending' | 'streaming'>('idle');

export function ChatForm<T>({
  children,
  onSend,
  initialContext,
}: {
  children: ReactNode;
  initialContext: T;
  onSend: SendMessage<T>;
}) {
  const [requestContext, setRequestContext] = React.useState(initialContext);
  const [conversation, setConversation] = React.useState([] as ReactNode[]);
  const [key, setKey] = React.useState(0); // Used to reset the form after each send.
  const [status, setStatus] = React.useState<'idle' | 'pending' | 'streaming'>('idle');

  return (
    <ConversationContext.Provider value={conversation}>
      <StatusContext.Provider value={status}>
        <form
          key={key}
          action={(formData) => {
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
    return streaming || pending || children;
  }

  if (status === 'pending') {
    return pending || children;
  }

  return children;
}

export function Submit(props: { pending: ReactNode; children: ReactNode } & Record<string, any>) {
  const status = useContext(StatusContext);
  const { pending, children, ...rest } = props;
  return (
    <button type="submit" {...rest}>
      {status === 'idle' ? children : pending}
    </button>
  );
}

export function ConversationUI() {
  return useContext(ConversationContext);
}

export default function Chat({
  sendMessage,
}: {
  sendMessage: (conversation: string[], message: string) => Promise<{ stream: ReactNode; reply: Promise<string> }>;
}) {
  const [conversation, setConversation] = useState([] as string[]);
  const [children, setChildren] = useState([] as ReactNode[]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function send() {
    if (isLoading) {
      return;
    }

    const messageToSend = message;
    setIsLoading(true);
    setConversation((c) => c.concat(messageToSend));
    setMessage('');
    setChildren((c) => c.concat([<User key={c.length}>{messageToSend}</User>]));
    const messageResult = await sendMessage(conversation, messageToSend);
    setChildren((c) => c.concat([<Assistant key={c.length}>{messageResult.stream}</Assistant>]));
    const reply = await messageResult.reply;
    setConversation((c) => c.concat(reply));
    setIsLoading(false);
  }

  return (
    <>
      <ul>{children}</ul>
      <div className="mt-4 flex w-full">
        <input
          type="text"
          autoFocus
          className="w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-fixie-fresh-salmon sm:text-sm sm:leading-6"
          placeholder={'Say something...'}
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="ml-4 rounded-md bg-fixie-fresh-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fixie-ripe-salmon focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon"
          onClick={() => send()}
        >
          {isLoading ? 'Waiting...' : 'Send'}
        </button>
      </div>
    </>
  );
}
