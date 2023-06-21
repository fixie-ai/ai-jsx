/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/next';
import React, { Suspense } from 'react';
import { DocsAgent } from './ai';
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

const AgentResponse = function AgentResponse({ question }: { question: string }) {
  return (
    <ConversationItem responseType="bot">
      <Suspense fallback="⎕">
        <AI.jsx>
          <DocsAgent question={question} />
        </AI.jsx>
      </Suspense>
    </ConversationItem>
  );
};

export default function DocsChat({ searchParams }: { searchParams: any }) {
  const defaultValue = 'What is AI.JSX?';
  const query = searchParams.message ?? defaultValue;
  const userMessages = [query];

  return (
    <ResultContainer
      title="Docs Chat"
      description={
        <>
          In this demo, you can ask questions about the{' '}
          <a href="https://docs.ai-jsx.com" target="_blank" rel="noopener noreferrer" className="underline">
            AI.JSX documentation
          </a>
          .
        </>
      }
    >
      <ul>
        {userMessages.map((response, index) => [
          <li key={`${index}-user`} className="mt-4">
            <ConversationItem responseType="user">{response}</ConversationItem>
          </li>,
          <li key={`${index}-agent`} className="mt-4">
            <AgentResponse question={response} />
          </li>,
        ])}
      </ul>
      <form className="mt-4 flex w-full">
        <input
          type="text"
          name="message"
          placeholder="Ask a question..."
          className="w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-fixie-fresh-salmon sm:text-sm sm:leading-6"
        />
        <button
          type="submit"
          className="ml-4 rounded-md bg-fixie-fresh-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fixie-ripe-salmon focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon"
        >
          Send
        </button>
      </form>
    </ResultContainer>
  );
}
