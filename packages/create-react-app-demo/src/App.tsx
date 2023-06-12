import './App.css';
import * as LLMx from '@fixieai/ai-jsx';
import React from 'react';
import { AIRoot } from './ai.tsx';
import { useState } from 'react';

// function AIResponseToReact({ children }: { children: string }) {
//   function extractContents(children: string) {
//     const regex = /(TEXT|UI):\s*([\w\d\s]+)/g;
//     let match;
//     const result = [];

//     while ((match = regex.exec(children)) !== null) {
//       result.push({ type: match[1], content: match[2].trim() });
//     }

//     return result;
//   }

//   const extractedContents = extractContents(children);
//   return <>
//   </>
// }

function App() {
  return (
    <div className="App">
      <AIRoot />
    </div>
  );
}

export default App;
