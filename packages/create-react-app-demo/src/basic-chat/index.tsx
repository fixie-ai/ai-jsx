/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/react';
import React, {useState} from 'react';
import { ChatAgent } from './ai.tsx';
import { useList } from 'react-use';
import ResultContainer from '../ResultContainer.tsx';

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

/**
 * We need to memoize this function. Otherwise, every time the parent component of AgentResponse re-renders,
 * AgentReponse will re-render, which will trigger a new LLM call, which will produce a different result than the
 * prior call.
 */
const AgentResponse = React.memo(function AgentResponse({
  conversation,
  setCallInProgress,
}: {
  conversation: any[];
  setCallInProgress: (x: boolean) => void;
}) {
  return (
    <ConversationItem responseType="bot">
      <AI.jsx
        onStreamStart={() => setCallInProgress(true)}
        onStreamEnd={() => setCallInProgress(false)}
        loading="Thinking..."
      >
        <ChatAgent conversation={conversation} />
      </AI.jsx>
    </ConversationItem>
  );
});

export function BasicChat() {
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
    <ResultContainer title="Basic Chat" description="In this demo, you can chat with a quirky assistant.">
      <ul>
        {userMessages.map((response, index) => [
          <li key={`${index}-user`} className="mt-4">
            <ConversationItem responseType="user">{response}</ConversationItem>
          </li>,
          <li key={`${index}-agent`} className="mt-4">
            <AgentResponse conversation={userMessages} setCallInProgress={setCallInProgress} />
          </li>,
        ])}
      </ul>      
      <form onSubmit={handleInputSubmit} className="mt-4 flex w-full">
        <input
          disabled={callInProgress}
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
