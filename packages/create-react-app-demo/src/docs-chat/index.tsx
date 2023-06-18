/** @jsx AI.createElement */
/** @jsxFrag AI.Fragment */
import * as AI from 'ai-jsx/react';
import React from 'react';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';
import { ChatMessage, DocsAgent, conversationAtom } from './ai.tsx';
import { atom, useAtom } from 'jotai';
import ResultContainer from '../ResultContainer.tsx';

const modelCallInProgress = atom<boolean>(false);

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

function AgentResponse({ question }: { question: ChatMessage['content'] }) {
  // const [, setCallInProgress] = useAtom(modelCallInProgress);
  const setCallInProgress = (x: any) => {};

  return (
    <ConversationItem responseType="bot">
      <AI.jsx onStreamStart={() => setCallInProgress(true)} onStreamEnd={() => setCallInProgress(false)}>
        <DocsAgent question={question} />
      </AI.jsx>
    </ConversationItem>
  );
}

export function DocsChat() {
  const [conversation, setConversation] = useAtom(conversationAtom);
  const [callInProgress] = useAtom(modelCallInProgress);

  function handleInputSubmit(event: React.FormEvent<HTMLFormElement>) {
    // @ts-expect-error
    const element = event.target.elements.message;
    event.preventDefault();
    setConversation((prev) => [
      ...prev,
      {
        type: 'user',
        content: element.value,
      },
    ]);

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
        {conversation.map((response, index) => (
          <>
            <li key={`${index}-user`} className="mt-4">
              <ConversationItem responseType={response.type}>{response.content}</ConversationItem>
            </li>
            <li key={`${index}-agent`} className="mt-4">
              <AgentResponse question={response.content} />
            </li>
          </>
        ))}
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
