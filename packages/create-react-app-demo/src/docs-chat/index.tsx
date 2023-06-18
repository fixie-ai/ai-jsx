/** @jsx AI.createElement */
/** @jsxFrag AI.Fragment */
import * as AI from 'ai-jsx/react';
import * as React from 'react';
import { useState } from 'react';
import { ChatMessage, DocsAgent } from './ai.tsx';
import { useList } from 'react-use';
import ResultContainer from '../ResultContainer.tsx';

function ConversationItem({
  responseType,
  children: responseContent,
}: {
  responseType: ChatMessage['type'];
  children: React.ReactNode;
}) {
  const emoji = responseType === 'user' ? '👤' : '🤖';
  return (
    <div>
      {emoji}: {responseContent}
    </div>
  );
}

const AgentResponse = React.memo(function AgentResponse({
  question,
  setCallInProgress,
}: {
  question: ChatMessage['content'];
  setCallInProgress: (x: boolean) => void;
}) {
  return (
    <ConversationItem responseType="bot">
      <AI.jsx
        onStreamStart={() => setCallInProgress(true)}
        onStreamEnd={() => setCallInProgress(false)}
        loading="Thinking..."
      >
        <DocsAgent question={question} />
      </AI.jsx>
    </ConversationItem>
  );
});

export function DocsChat() {
  const [userMessages, { push: pushUserMessage }] = useList<string>([]);
  const [callInProgress, setCallInProgress] = useState(false);

  function handleInputSubmit(event: React.FormEvent<HTMLFormElement>) {
    // @ts-expect-error
    const element = event.target.elements.message;
    event.preventDefault();
    pushUserMessage(element.value);

    element.value = '';
  }

  return (
    <ResultContainer
      title="Docs Chat"
      description={
        <>
          In this demo, you can ask questions about the{' '}
          <a href="https://docs.ai-jsx.com" target="_blank" rel="noopener noreferrer">
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
            <AgentResponse question={response} setCallInProgress={setCallInProgress} />
          </li>,
        ])}
      </ul>
      <form onSubmit={handleInputSubmit} className="mt-4 flex w-full">
        <input
          disabled={callInProgress}
          type="text"
          name="message"
          placeholder="Ask a question..."
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
