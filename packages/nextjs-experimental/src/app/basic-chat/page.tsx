/** @jsxImportSource ai-jsx/react */
import 'server-only';
import * as AI from 'ai-jsx/experimental/next';
import { AssistantMessage, ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import ResultContainer from '@/components/ResultContainer';
import Chat, { ChatForm, ChatState, ConversationUI, SendMessage, Submit } from '@/components/Chat';
import { ReactNode, Suspense } from 'react';

const ConversationContext = AI.createContext(null as AI.Node);

function AIConversation(
  {
    children,
  }: {
    children?: { [key: string]: (message: React.ReactNode, index: number) => React.ReactNode };
  },
  maybeContext?: AI.ComponentContext
) {
  if (maybeContext && 'render' in maybeContext) {
    return maybeContext.getContext(ConversationContext);
  }
  return <ConversationUI />;
}

async function AIChat({
  children,
  reply,
  user,
  assistant,
  message: messageProp,
}: {
  children: ReactNode;
  reply: () => Promise<AI.Node>;
  user: (node: ReactNode) => Promise<ReactNode>;
  assistant: (node: ReactNode) => Promise<ReactNode>;
  message?: string | ((inputs: any) => Promise<string>);
}) {
  const onSend: SendMessage<string[]> = async (formData: FormData, context: string[]) => {
    'use server';
    console.log(context, formData);
    const objectData = {} as Record<string, unknown>;
    for (const key of formData.keys()) {
      objectData[key] = formData.get(key);
    }

    const message =
      typeof messageProp === 'string'
        ? (formData.get(messageProp) as string)
        : typeof messageProp === 'function'
        ? await messageProp(objectData)
        : (formData.get('message') as string);

    const aiConversation: AI.Node[] = context
      .map<AI.Node>((message, i) =>
        i % 2 ? <UserMessage>{message}</UserMessage> : <AssistantMessage>{message}</AssistantMessage>
      )
      .concat([<UserMessage>{message}</UserMessage>]);

    let setFinalReply = (value: string) => {};
    const finalReplyPromise = new Promise<string>((resolve) => {
      setFinalReply = resolve;
    });

    const userMessage = await user(message);
    const assistantMessage = await assistant(
      <AI.JSX stream="smooth" onComplete={setFinalReply}>
        <ConversationContext.Provider value={aiConversation}>{await reply()}</ConversationContext.Provider>
      </AI.JSX>
    );

    return [[userMessage, assistantMessage], finalReplyPromise.then((finalReply) => context.concat([finalReply]))];
  };

  return (
    <ChatForm onSend={onSend} initialContext={[] as string[]}>
      {children}
    </ChatForm>
  );
}

export default function BasicChat() {
  return (
    <ResultContainer title="Basic Chat" description="In this demo, you can chat with a quirky assistant.">
      <AIChat
        reply={async () => {
          'use server';
          return (
            <ChatCompletion>
              <SystemMessage>You are a loquacious world-renowned expert on dinosaurs.</SystemMessage>
              <AIConversation />
            </ChatCompletion>
          );
        }}
        user={async (message) => {
          'use server';
          return <li className="whitespace-pre-line">👤: {message}</li>;
        }}
        assistant={async (message) => {
          'use server';
          return (
            <li className="whitespace-pre-line">
              🤖: <Suspense fallback="_">{message}</Suspense>
            </li>
          );
        }}
      >
        <ul>
          <AIConversation />
        </ul>
        <div className="mt-4 flex w-full">
          <input
            className="w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-fixie-fresh-salmon sm:text-sm sm:leading-6"
            placeholder={'Say something...'}
            name="message"
            type="text"
            autoFocus
          />

          <ChatState
            pending={
              <button
                className="disabled:opacity-25 ml-4 rounded-md bg-fixie-fresh-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fixie-ripe-salmon focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon"
                type="submit"
                disabled
              >
                Send
              </button>
            }
          >
            <button
              className="ml-4 rounded-md bg-fixie-fresh-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fixie-ripe-salmon focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon"
              type="submit"
            >
              Send
            </button>
          </ChatState>
        </div>
      </AIChat>
    </ResultContainer>
  );
}
