'use client';
import * as AI from 'ai-jsx/react';
import { useState, ReactNode } from 'react';

export function StreamDemo({ initialMessages }: { initialMessages: ReactNode[] }) {
  const [history, setHistory] = useState(initialMessages);
  const { current, fetchAI } = AI.useAIStream((final) => {
    setHistory((previous) => previous.concat([final]));
    return null;
  });
  const [query, setQuery] = useState('');

  return (
    <ol className="list-decimal">
      {history.map((previous, i) => (
        <li key={i} className="whitespace-pre-line">
          {previous}
        </li>
      ))}
      {current && <li className="whitespace-pre-line">{current}█</li>}
      <input
        id="topic"
        name="topic"
        type="text"
        className="block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        autoFocus
      />
      <button
        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        onClick={() => {
          setQuery('');
          fetchAI('/stream/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: query }),
          });
        }}
        disabled={Boolean(current)}
      >
        Write a haiku!
      </button>
    </ol>
  );
}
