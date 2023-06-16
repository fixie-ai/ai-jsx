import React from 'react';
import { AIRoot, ChatMessage, conversationAtom, modelCallInProgress } from './ai.tsx';
import { useAtom } from 'jotai';
import ResultContainer from '../ResultContainer.tsx';

function ConversationItem({ response }: { response: ChatMessage }) {
  const emoji = response.type === 'user' ? '👤' : '🤖';
  return (
    <div>
      <span className="font-bold">{emoji}:</span> "{response.content}"
    </div>
  );
}

function ConversationHistory() {
  const [conversation, setConversation] = useAtom(conversationAtom);
  const [callInProgress] = useAtom(modelCallInProgress);

  function handleInputSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConversation((prev) => [
      ...prev,
      {
        type: 'user',
        // @ts-expect-error
        content: event.target.elements.message.value,
      },
    ]);
    // @ts-expect-error
    event.target.elements.message.value = '';
  }

  return (
    <ResultContainer
      title="Document Chat"
      description="In this demo, you can ask questions about the show 'Silicon Valley'."
    >
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

export function DocsChat() {
  return (
    <>
      <AIRoot />
      <ConversationHistory />
    </>
  );
}
