import React from 'react';
import { AIRoot, ChatMessage, conversationAtom, modelCallInProgress } from './ai.tsx';
import { useAtom } from 'jotai';
import ResultContainer from '../ResultContainer.tsx';

function ConversationItem({ response }: { response: ChatMessage }) {
  const emoji = response.type === 'user' ? '👤' : '🤖';
  return (
    <div>
      {emoji}: {response.content}
    </div>
  );
}

function ConversationHistory() {
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
    <ResultContainer title="Basic Chat" description="In this demo, you can chat with a quirky assistant.">
      <ul>
        {conversation.map((response, index) => (
          <li key={index} className="mt-4">
            <ConversationItem response={response} />
          </li>
        ))}
      </ul>
      {callInProgress && <div>Waiting for AI response...</div>}
      <form onSubmit={handleInputSubmit} className="mt-4 w-full flex">
        <input
          disabled={callInProgress}
          type="text"
          name="message"
          className="rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 w-full"
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

export function BasicChat() {
  return (
    <>
      <AIRoot />
      <ConversationHistory />
    </>
  );
}
