import * as LLMx from '@fixieai/ai-jsx';
import { ChatCompletion, SystemMessage, UserMessage } from '@fixieai/ai-jsx/core/completion';
import { showInspector } from '@fixieai/ai-jsx/core/inspector';

function App() {
  return (
    <ChatCompletion>
      <SystemMessage>You are an assistant who only uses one syllable words.</SystemMessage>
      <UserMessage>Why is the sky blue?</UserMessage>
    </ChatCompletion>
  );
}

showInspector(<App />);
