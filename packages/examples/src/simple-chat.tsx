import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { showJSX } from './utils.js';

function App() {
  return (
    <ChatCompletion>
      <SystemMessage>You are an assistant who only uses one syllable words.</SystemMessage>
      <UserMessage>Why is the sky blue?</UserMessage>
    </ChatCompletion>
  );
}

showJSX(<App />);
