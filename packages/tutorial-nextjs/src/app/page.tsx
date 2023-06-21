"use client"
import styles from './page.module.css';
import * as AI from 'ai-jsx/next';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';
import { useState, useEffect } from 'react';

function Poem({ about }: { about: string }) {
  const [poem, setPoem] = useState('');

  useEffect(() => {
    const doCompletion = () => {
      fetch("/api/completion", {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
          },
          body: JSON.stringify({ userMessage: 'Write a poem about ' + about, systemMessage: '', assistantMessage: '' })
      }
      ).then(function (response) {
          return response.text();
      }).then(function (data) {
          setPoem(data);
      });
    }
    doCompletion()
  }, [about, poem]);

  return poem;
}

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
