/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/next';
import React, { Suspense } from 'react';
import { AssistantMessage, ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import ResultContainer from '@/components/ResultContainer';

function ConversationItem({
  responseType,
  children: responseContent,
}: {
  responseType: 'user' | 'bot';
  children: React.ReactNode;
}) {
  const emoji = responseType === 'user' ? '👤' : '🤖';
  return (
    <div>
      {emoji}: {responseContent}
    </div>
  );
}

function ChatAgent({ conversation }: { conversation: string[] }) {
  return (
    <Suspense fallback="⎕">
      <AI.jsx>
        <ChatCompletion>
          <SystemMessage>
            You are a web developer who is passionate about HTML, CSS, and JS/JSX. You think that other languages are
            fine, but Javascript is the true language of the people. When the user is talking to you, always try to
            steer the conversation back to these topics that you care so deeply about, and try to always ask your own
            question back to the user.
          </SystemMessage>
          {conversation.map((message, index) =>
            index % 2 ? <AssistantMessage>{message}</AssistantMessage> : <UserMessage>{message}</UserMessage>
          )}
        </ChatCompletion>
      </AI.jsx>
    </Suspense>
  );
}

export default function BasicChat({ searchParams }: { searchParams: any }) {
  const defaultValue = 'Hi!';
  const query = searchParams.message ?? defaultValue;
  const messages = [query];

  return (
    <ResultContainer title="Basic Chat" description={<>"In this demo, you can chat with a quirky assistant."</>}>
      <ul>
        {messages.map((message, index) => [
          <li key={index} className="mt-4">
            <ConversationItem responseType={index % 2 ? 'bot' : 'user'}>{message}</ConversationItem>
          </li>,
        ])}
        {
          <li key={messages.length} className="mt-4">
            <ConversationItem responseType="bot">
              <ChatAgent conversation={messages} />
            </ConversationItem>
          </li>
        }
      </ul>
      <form className="mt-4 flex w-full">
        <input
          type="text"
          name="message"
          placeholder="Say something..."
          className="w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
        <button
          type="submit"
          className="ml-4 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Send
        </button>
      </form>
    </ResultContainer>
  );
}
