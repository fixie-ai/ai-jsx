import * as AI from 'ai-jsx';
import { ChatCompletion } from 'ai-jsx/core/completion';
import { ShowConversation, UserMessage, Shrinkable } from 'ai-jsx/core/conversation';
import { showJSX } from './utils.js';

function App() {
  const messages = [] as AI.Node[];
  let lastValue = 0;
  while (messages.length < 16) {
    const counting = [];
    for (let i = 0; i < 2 ** messages.length; ++i) {
      counting.push(++lastValue);
    }

    messages.push(
      <Shrinkable importance={0 - messages.length}>
        <UserMessage>{counting.join(' ')}</UserMessage>
      </Shrinkable>
    );
  }

  return (
    <>
      We counted to {lastValue} but messages will be evicted such that the AI won't see the messages that overflowed the
      context window.{'\n\n'}
      <ShowConversation
        present={(m) => (
          <>
            {m.type}: {m}
            {'\n'}
          </>
        )}
      >
        <ChatCompletion>
          <UserMessage>I'm going to count now:</UserMessage>
          {messages}
          <UserMessage>How high did I count?</UserMessage>
        </ChatCompletion>
      </ShowConversation>
    </>
  );
}

showJSX(<App />);
