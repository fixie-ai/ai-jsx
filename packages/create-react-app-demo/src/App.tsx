import './App.css';
import * as LLMx from '@fixieai/ai-jsx';
import React from 'react';
import { AIRoot, ChatMessage, conversationAtom } from './ai.tsx';
import { useState } from 'react';
import { useAtom } from 'jotai';

// function AIResponseToReact({ children }: { children: string }) {
//   function extractContents(children: string) {
//     const regex = /(TEXT|UI):\s*([\w\d\s]+)/g;
//     let match;
//     const result = [];

//     while ((match = regex.exec(children)) !== null) {
//       result.push({ type: match[1], content: match[2].trim() });
//     }

//     return result;
//   }

//   const extractedContents = extractContents(children);
//   return <>
//   </>
// }

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
  return (
    <div>
      <h1>Chat</h1>
      {conversation.length ? (
        <ul>
          {conversation.map((response, index) => {
            return (
              <li key={index}>
                <ConversationItem response={response} isLastResponse={index === conversation.length - 1} />
              </li>
            );
          })}
        </ul>
      ) : (
        'Loading...'
      )}
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
