/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/next';
import * as React from 'react';
import { Suspense } from 'react';
import { DocsAgent } from './ai';
import ResultContainer from '@/components/ResultContainer';
// @ts-expect-error
import { kv } from '@vercel/kv';
import { readFile, appendFile } from 'node:fs/promises';

interface ConversationMessage {
  author: 'user' | 'bot';
  message: string;
}

function ConversationItem({
  responseType,
  children: responseContent,
}: {
  responseType: 'user' | 'bot';
  children: React.ReactNode;
}) {
  const emoji = responseType === 'user' ? '👤' : '🤖';
  return (
    <li className="mt-4">
      {emoji}: {responseContent}
    </li>
  );
}

async function* DocsResponse(
  {
    conversation,
    children,
    onComplete,
  }: {
    conversation: ConversationMessage[];
    children: AI.Node;
    onComplete: (messages: ConversationMessage[]) => Promise<unknown>;
  },
  { render, logger }: AI.ComponentContext
) {
  logger.warn({ conversation }, 'Ignoring conversation');
  const query = await render(children);
  const response = yield* render(<DocsAgent question={query} />);

  await onComplete([
    { author: 'user', message: query },
    { author: 'bot', message: response },
  ]);
  return response;
}

async function getConversation(id: string): Promise<ConversationMessage[]> {
  if (process.env.KV_REST_API_URL) {
    return kv.lrange(id, 0, -1);
  }

  try {
    const data = await readFile(`${id}.conversation`, { encoding: 'utf-8' });
    return data
      .split('\n')
      .filter((x) => x !== '')
      .map((x) => JSON.parse(x));
  } catch {
    return [];
  }
}

async function appendConversation(id: string, ...messages: ConversationMessage[]): Promise<void> {
  if (process.env.KV_REST_API_URL) {
    await kv.rpush(id, ...messages);
    return;
  }

  await appendFile(`${id}.conversation`, messages.map((m) => JSON.stringify(m) + '\n').join(''), { encoding: 'utf-8' });
}

export default async function DocsChat({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { message?: string };
}) {
  const conversationHistory = await getConversation(params.id);
  const newMessage =
    conversationHistory.length == 0 && searchParams.message === undefined ? 'What is AI.JSX?' : searchParams.message;

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
        {conversationHistory.map((response, index) => (
          <ConversationItem responseType={response.author}>{response.message}</ConversationItem>
        ))}
        {newMessage !== undefined && (
          <>
            <ConversationItem responseType="user">{newMessage}</ConversationItem>
            <ConversationItem responseType="bot">
              <Suspense fallback="⎕">
                <AI.jsx>
                  <DocsResponse
                    conversation={conversationHistory}
                    onComplete={(messages) => appendConversation(params.id, ...messages)}
                  >
                    {newMessage}
                  </DocsResponse>
                </AI.jsx>
              </Suspense>
            </ConversationItem>
          </>
        )}
      </ul>
      <form className="mt-4 flex w-full">
        <input
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
