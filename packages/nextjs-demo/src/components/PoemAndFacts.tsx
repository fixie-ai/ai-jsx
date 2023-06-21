'use client';

import { useAIStream } from 'ai-jsx/react';
import { useState } from 'react';

export function PoemAndFacts({ topic }: { topic: string }) {
  const [activeTopic, setActiveTopic] = useState(null as string | null);
  const { current, fetchAI } = useAIStream();

  if (activeTopic !== topic) {
    setActiveTopic(topic);
    fetchAI('/basic-completion/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
  }

  return <div className="whitespace-pre-line">{current}</div>;
}
