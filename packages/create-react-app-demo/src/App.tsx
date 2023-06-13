import './App.css';
import React from 'react';
import { AIRoot, ChatMessage, conversationAtom, modelCallInProgress } from './ai.tsx';
import { useState } from 'react';
import { useAtom } from 'jotai';

function DebugConversation() {
  const [conversation] = useAtom(conversationAtom);
  return (
    <div>
      <h1>Debug: Conversation as JSON</h1>
      <ul>
        {conversation.map((response, index) => {
          return <li key={index}>{JSON.stringify(response)}</li>;
        })}
      </ul>
    </div>
  );
}

function ConversationItem({ response, isLastResponse }: { response: ChatMessage; isLastResponse: boolean }) {
  const [, setConversation] = useAtom(conversationAtom);

  if (response.type === 'user') {
    if (response.action === 'chat') {
      return <div>User: {response.content}</div>;
    }
    return <div>User clicked: {response.id}</div>;
  }
  return (
    <div>
      AI:{' '}
      {response.parts.flatMap((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.content}</span>;
        }
        if (part.type === 'ui') {
          return part.content.map((row, index) => (
            <li key={index}>
              {row.map((button) => {
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
                return (
                  <button disabled={!isLastResponse} onClick={handleClick}>
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
  const [conversation] = useAtom(conversationAtom);
  const [callInProgress] = useAtom(modelCallInProgress);
  return (
    <div>
      <h1>Chat</h1>
      {
        <ul>
          {conversation.map((response, index) => {
            return (
              <li key={index}>
                <ConversationItem response={response} isLastResponse={index === conversation.length - 1} />
              </li>
            );
          })}
        </ul>
      }
      {callInProgress && <div>Waiting for AI response...</div>}
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <AIRoot />
      <ConversationHistory />
      <DebugConversation />
    </div>
  );
}

export default App;
