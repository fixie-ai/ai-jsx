import './App.css';
import * as LLMx from '@fixieai/ai-jsx';
import React from 'react';
import { AIRoot } from './ai.tsx';
import { useState } from 'react';

function App() {
  return (
    <div className="App">
      <AIRoot />
    </div>
  );
}

export default App;
