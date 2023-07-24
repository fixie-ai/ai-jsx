import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { showInspector } from 'ai-jsx/core/inspector';
import { ReplicateLlama2 } from 'ai-jsx/lib/replicate-llama2';

function App() {
  return (
    <ChatCompletion>
      <SystemMessage>You are an assistant who only uses one syllable words.</SystemMessage>
      <UserMessage>Why is the sky blue?</UserMessage>
    </ChatCompletion>
  );
}

showInspector(<>
  <ReplicateLlama2>
      <App />
  </ReplicateLlama2>
  <ReplicateLlama2 maxTokens={10}>
      <App />
  </ReplicateLlama2>
  <ReplicateLlama2 temperature={3}>
      <App />
  </ReplicateLlama2>
</>);
