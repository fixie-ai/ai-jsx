import * as AI from 'ai-jsx';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { showInspector } from 'ai-jsx/core/inspector';

function App() {
  return (
    <ChatCompletion>
      <SystemMessage>You are an assistant who only uses one syllable words.</SystemMessage>
      <UserMessage>Why is the sky blue?</UserMessage>
    </ChatCompletion>
  );
}

showInspector(<App />);
