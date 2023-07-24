/** @jsxImportSource ai-jsx/react */
import { Chat, Conversation, Message, ChatState, sendMessage, SerializedMessage } from 'ai-jsx/experimental/next/chat';
import { ChatCompletion, SystemMessage } from 'ai-jsx/core/completion';
import ResultContainer from '@/components/ResultContainer';
import { Suspense } from 'react';

export default function BasicChat() {
  return (
    <ResultContainer title="Basic Chat" description="In this demo, you can chat with a quirky assistant.">
      <Chat
        onSend={async (formData, conversation?: SerializedMessage[]) => {
          'use server';
          return sendMessage(
            formData.get('message') as string,
            <ChatCompletion>
              <SystemMessage>
                You are a web developer who is passionate about HTML, CSS, and JS/JSX. You think that other languages
                are fine, but Javascript is the true language of the people. When the user is talking to you, always try
                to steer the conversation back to these topics that you care so deeply about, and try to always ask your
                own question back to the user.
              </SystemMessage>
              <Conversation />
            </ChatCompletion>,
            conversation
          );
        }}
      >
        <ul>
          <Conversation>
            {{
              user: (
                <li className="whitespace-pre-line">
                  👤: <Message />
                </li>
              ),
              assistant: (
                <li className="whitespace-pre-line">
                  🤖:{' '}
                  <Suspense fallback="_">
                    <Message />
                  </Suspense>
                </li>
              ),
            }}
          </Conversation>
        </ul>
        <div className="mt-4 flex w-full">
          <input
            className="w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-fixie-fresh-salmon sm:text-sm sm:leading-6"
            placeholder={'Say something...'}
            name="message"
            type="text"
            autoFocus
          />

          <ChatState
            pending={
              <button
                className="disabled:opacity-25 ml-4 rounded-md bg-fixie-fresh-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fixie-ripe-salmon focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon"
                type="submit"
                disabled
              >
                Send
              </button>
            }
          >
            <button
              className="ml-4 rounded-md bg-fixie-fresh-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fixie-ripe-salmon focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon"
              type="submit"
            >
              Send
            </button>
          </ChatState>
        </div>
      </Chat>
    </ResultContainer>
  );
}
