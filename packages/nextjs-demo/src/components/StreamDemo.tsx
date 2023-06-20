'use client';
import * as AI from 'ai-jsx/react';

export function StreamDemo() {
  const { current, fetchAI, isStreaming } = AI.useAIStream(
    <button
      className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      onClick={() => fetchAI('/stream/api')}
    >
      Go!
    </button>
  );

  return (
    <div className="whitespace-pre-line">
      {current}
      {isStreaming && '█'}
    </div>
  );
}
