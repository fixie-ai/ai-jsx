import './App.css';
import * as LLMx from '@fixieai/ai-jsx';
import {useState} from 'react';

function AI({children}) {
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
      <AI>
        {LLMx.createElement('Completion', {children: 'list of dog names'})}
      </AI>
    </div>
  );
}

export default App;
