/**
 * This is the main page for the AI.JSX Next.js App Demo.
 *
 * This page invokes the /api/completion edge function via a fetch call,
 * passing in the prompt to the LLM. The edge function (found in api/completion/route.tsx)
 * runs AI.JSX, passes the prompt to the LLM, renders the result, and returns it to the client.
 */

'use client';
import styles from './page.module.css';
import { useState, useEffect } from 'react';

/**
 * A component that generates a poem about a given topic.
 */
function Poem({ about }: { about: string }) {
  const [poem, setPoem] = useState('');

  useEffect(() => {
    if (poem !== '') {
      return;
    }
    const prompt = 'Write a poem about ' + about + '.';

    const doCompletion = () => {
      fetch('/api/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ userMessage: prompt }),
      })
        .then(function (response) {
          return response.text();
        })
        .then(function (data) {
          setPoem(data);
        });
    };
    doCompletion();
  }, [about, poem]);

  return poem;
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
        <Poem about="A red panda who likes to eat grapes" />
      </div>
    </main>
  );
}
