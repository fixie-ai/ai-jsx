import * as LLMx from 'ai-jsx';
import { UserMessage } from 'ai-jsx/core/completion';
import { JsonChatCompletion, YamlChatCompletion } from 'ai-jsx/batteries/constrained-output';
import { showInspector } from 'ai-jsx/core/inspector';

function App() {
  const query = 'Create a nested family tree with names and ages. It should include a total of 5 people.';
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
