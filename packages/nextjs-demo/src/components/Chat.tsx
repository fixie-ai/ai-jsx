'use client';
import * as AI from 'ai-jsx/react';
import { useState, ReactNode } from 'react';

export default function Chat({
  initialMessages,
  placeholder,
  endpoint,
}: {
  initialMessages: ReactNode[];
  placeholder: string;
  endpoint: string;
}) {
  const [history, setHistory] = useState(initialMessages);
  const { current, fetchAI } = AI.useAIStream({
    onComplete(final) {
      setHistory((previous) => previous.concat([final]));
      return null;
    },
  });
  const [value, setValue] = useState('');
  function send() {
    const messages = [...history, value];
    setValue('');
    setHistory(messages);
    fetchAI(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
  }

  return (
    <ul>
      {history.map((previous, i) => (
        <li key={i} className="whitespace-pre-line">
          {i % 2 ? '🤖' : '👤'}: {previous}
        </li>
      ))}
      {current && <li className="whitespace-pre-line">🤖: {current}⎕</li>}
      <div className="mt-4 flex w-full">
        <input
          type="text"
          className="w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-fixie-fresh-salmon sm:text-sm sm:leading-6"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              send();
            }
          }}
        />
        <button
          className="ml-4 rounded-md bg-fixie-fresh-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fixie-ripe-salmon focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon"
          onClick={() => send()}
          disabled={Boolean(current)}
        >
          Send
        </button>
      </div>
    </ul>
  );
}
