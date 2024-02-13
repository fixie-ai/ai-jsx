import { ChatCompletion, SystemMessage, UserMessage, Completion } from 'ai-jsx/core/completion';
import { ReplicateLlama2 } from 'ai-jsx/lib/replicate-llama2';
import { showJSX } from './utils.js';

function Question() {
  return (
    <ChatCompletion>
      <SystemMessage>Answer in French</SystemMessage>
      <UserMessage>Why is the sky blue?</UserMessage>
    </ChatCompletion>
  );
}

function App() {
  return (
    <>
      Baseline:{'\n'}
      <ReplicateLlama2>
        <Question />
      </ReplicateLlama2>
      {'\n'}
      {'\n'}
      Max tokens 10:{'\n'}
      <ReplicateLlama2 maxTokens={10}>
        <Question />
      </ReplicateLlama2>
      {'\n'}
      {'\n'}
      Temperature 3:{'\n'}
      <ReplicateLlama2 temperature={3}>
        <Question />
      </ReplicateLlama2>
      Temperature 3:{'\n'}
      <ReplicateLlama2>
        <Completion>List of cities: 1. Seattle 2. San Francisco 3. Paris</Completion>
      </ReplicateLlama2>
    </>
  );
}

showJSX(<App />);
