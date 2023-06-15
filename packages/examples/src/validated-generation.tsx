import * as LLMx from 'ai-jsx';
import { UserMessage } from 'ai-jsx/core/completion';
import { JsonChatCompletion, YamlChatCompletion } from 'ai-jsx/core/constrained-output';
import { showInspector } from 'ai-jsx/core/inspector';

function App() {
  const query = 'Create a random object describing an imaginary person that has a "name", "gender", and "age".';
  return (
    <>
      JSON generation example:{'\n'}
      <JsonChatCompletion>
        <UserMessage>{query}</UserMessage>
      </JsonChatCompletion>
      {'\n\n'}
      YAML generation example:{'\n'}
      <YamlChatCompletion>
        <UserMessage>{query}</UserMessage>
      </YamlChatCompletion>
    </>
  );
}

showInspector(<App />);
