import './App.css';
import * as LLMx from '@fixieai/ai-jsx';
import { AIRoot } from './ai.tsx';
import {useState} from 'react';

function AI({children}: {children: LLMx.Node}) {
  const [frame, setFrame] = useState('');
  LLMx.createRenderContext({
    logger: function() {
      debugger;
    },
  }).render(children, {
    map: setFrame,
  });
  return frame;
}

function App() {
  return (
    <div className="App">
      <AIRoot />
    </div>
  );
}

export default App;
