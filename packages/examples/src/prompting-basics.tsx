import { UserMessage, ChatCompletion } from 'ai-jsx/core/completion';
import { Prompt } from 'ai-jsx/batteries/prompts';
import { showInspector } from 'ai-jsx/core/inspector';

function PersonaDesribeJSX() {
  return (
    <>
      What is JSX?{'\n'}A 5 year old's answer:{'\n'}
      <ChatCompletion>
        <Prompt persona="a 5 year old" />
        <UserMessage>What is JSX?</UserMessage>
      </ChatCompletion>
      {'\n\n'}A React developer's answer:{'\n'}
      <ChatCompletion>
        <Prompt persona="a React developer" />
        <UserMessage>What is JSX?</UserMessage>
      </ChatCompletion>
      {'\n\n'}
      Creator of Next.js's answer:{'\n'}
      <ChatCompletion>
        <Prompt persona="the creator of Next.js" />
        <UserMessage>What is JSX?</UserMessage>
      </ChatCompletion>
    </>
  );
}

function WordPuzzle() {
  return (
    <ChatCompletion>
      <UserMessage>What is the 4th word in the phrase "I am not what I am"?</UserMessage>
      <Prompt stepByStep />
    </ChatCompletion>
  );
}

function App() {
  return (
    <>
      Persona example:{'\n'}
      <PersonaDesribeJSX />
      {'\n\n-----\n\n'}
      Word puzzle example:{'\n'}
      <WordPuzzle />
    </>
  );
}

showInspector(<App />);
