/** @jsxImportSource ai-jsx/react */
// The line above is important! It is required in order to
// embed AI.JSX components into a React app.

import styles from './page.module.css';
import * as AI from 'ai-jsx/next';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';

function Poem({ about }: { about: string }) {
  return 'Hello World';
  // return (
  //   <AI.jsx>
  //     <ChatCompletion>
  //       <UserMessage>Write a poem about {about}.</UserMessage>
  //     </ChatCompletion>
  //   </AI.jsx>
  // );
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
