/**
 * This is the main page for the AI.JSX Next.js App Demo.
 *
 * This page invokes the /api/poem edge function via a fetch call, passing in the
 * prompt to the LLM. The edge function (found in api/poem/route.tsx) runs AI.JSX,
 * passes the prompt to the LLM and streams the result back to the client.
 */

'use client';
import styles from './page.module.css';
import { useState } from 'react';
import { useAIStream } from 'ai-jsx/react';

/**
 * A component that generates a poem about a given topic.
 */
function PoemGenerator() {
  const DEFAULT_PROMPT = 'A red panda who likes to eat grapes';
  const { current, fetchAI } = useAIStream({});
  const [topic, setTopic] = useState(DEFAULT_PROMPT);

  return (
    <div style={{ width: '600px' }}>
      <textarea value={topic} onChange={(e) => setTopic(e.currentTarget.value)} style={{ width: '100%' }} />
      <br />
      <input
        type="submit"
        value="Write a poem"
        disabled={topic.trim() === ''}
        // When the button is clicked, we fire off a POST request to the /api/poem
        // handler defined in api/poem/route.tsx. fetchAI() is a wrapper around fetch()
        // that decodes the stream of responses from the edge function, and sets the value
        // of the `current` variable to the most recent response.
        onClick={() => {
          fetchAI('/api/poem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic }),
          });
        }}
      />
      {current && <div style={{ width: '100%', whiteSpace: 'pre-line', paddingTop: '10px' }}>{current}</div>}
    </div>
  );
}

/**
 * The main page for the AI.JSX Next.js App Demo.
 */
export default function Home() {
  return (
    <main className={styles.main}>
      <div>
        <h2>AI.JSX Next.js App Demo</h2>
      </div>
      <div>
        <PoemGenerator />
      </div>
    </main>
  );
}
