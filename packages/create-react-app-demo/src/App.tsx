import './App.css';
import React from 'react';
import { AIRoot, ChatMessage, conversationAtom, modelCallInProgress } from './ai.tsx';
import { useAtom } from 'jotai';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import RootLayout from './layout.tsx';
import ResultContainer from './ResultContainer.tsx';
import classnames from 'classnames';

const router = createBrowserRouter([
  {
    path: '',
    element: <RootLayout />,
    children: [
      {
        path: '',
        element: <ChooseYourOwnAdventure />,
      },
    ],
  },
]);

function DebugConversation() {
  const [conversation] = useAtom(conversationAtom);
  return (
    <ResultContainer
      title="Conversation as JSON"
      description="For debug purposes, this card shows the full JSON record of the conversation."
    >
      <ul>
        {conversation.map((response, index) => {
          return <li key={index}>{JSON.stringify(response)}</li>;
        })}
      </ul>
    </ResultContainer>
  );
}

function ConversationItem({ response, isLastResponse }: { response: ChatMessage; isLastResponse: boolean }) {
  const [, setConversation] = useAtom(conversationAtom);

  if (response.type === 'user') {
    if (response.action === 'chat') {
      return (
        <div>
          <span className="font-bold">User:</span> "{response.content}"
        </div>
      );
    }
    return (
      <div>
        <span className="font-bold">User clicked:</span> {response.id}
      </div>
    );
  }
  return (
    <div>
      <span className="font-bold">AI:</span>{' '}
      {response.parts.flatMap((part, index) => {
        if (part.type === 'text') {
          return <div key={index}>{part.content}</div>;
        }
        if (part.type === 'ui') {
          if (typeof part.content.map !== 'function') {
            throw new Error(`invalid JSON from model: ${JSON.stringify(part)}`);
          }
          return part.content.map((row, index) => (
            <li key={index} className="isolate inline-flex rounded-md shadow-sm">
              {row.map((button, buttonIndex) => {
                function handleClick() {
                  setConversation((prev) => [
                    ...prev,
                    {
                      type: 'user',
                      action: 'click',
                      id: button.id,
                    },
                  ]);
                }

                const isFirstButton = buttonIndex === 0;
                const isLastButton = buttonIndex === row.length - 1;
                const disabled = !isLastResponse;
                return (
                  <button
                    disabled={disabled}
                    onClick={handleClick}
                    className={classnames(disabled ? 'cursor-not-allowed bg-gray-100' : 'hover:bg-gray-50', {
                      'relative inline-flex items-center rounded-l-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:z-10':
                        isFirstButton,
                      'relative -ml-px inline-flex items-center bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:z-10':
                        !(isFirstButton || isLastButton),
                      'relative -ml-px inline-flex items-center rounded-r-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:z-10':
                        isLastButton,
                    })}
                  >
                    {button.text}
                  </button>
                );
              })}
            </li>
          ));
        }
        return null;
      })}
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
        action: 'chat',
        // @ts-expect-error
        content: event.target.elements.message.value,
      },
    ]);
    // @ts-expect-error
    event.target.elements.message.value = '';
  }

  return (
    <ResultContainer
      title="Chat"
      description="In this demo, the AI is able to respond by rendering both text and buttons as it sees fit. As the user interacts with the buttons (or types freeform responses), the AI ambiently adapts."
    >
      {
        <ul>
          {conversation.map((response, index) => {
            return (
              <li key={index} className="mt-4">
                <ConversationItem response={response} isLastResponse={index === conversation.length - 1} />
              </li>
            );
          })}
        </ul>
      }
      {callInProgress && <div>Waiting for AI response...</div>}
      <form onSubmit={handleInputSubmit} className="mt-4">
        <input
          disabled={callInProgress}
          type="text"
          name="message"
          className="rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
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

function ChooseYourOwnAdventure() {
  return (
    <>
      <AIRoot />
      <ConversationHistory />
      <DebugConversation />
    </>
  );
}

function App() {
  return <RouterProvider router={router} />;
}

export default App;
