import { LLMx } from '../lib/index.js';
import { AssistantMessage, ChatCompletion, SystemMessage, UserMessage } from '../lib/completion-components.js';
import { DebugTree } from '../lib/debug.js';
import { Inline, Scope } from '../lib/inline.js';

function App() {
  return (
    <Scope>
      User: <UserMessage>Why is the sky blue?</UserMessage>
      {'\n'}
      {'\n'}
      Assistant:{' '}
      <Inline>
        {(conversation) => (
          <AssistantMessage>
            <ChatCompletion temperature={1}>
              <SystemMessage>Be terse and use jargon.</SystemMessage>
              {conversation}
            </ChatCompletion>
          </AssistantMessage>
        )}
      </Inline>
      {'\n\n'}
      User: <UserMessage>I don't understand.</UserMessage>
      {'\n\n'}
      Assistant:{' '}
      <Inline>
        {(conversation) => (
          <AssistantMessage>
            <ChatCompletion temperature={1}>
              <SystemMessage>Be apologetic.</SystemMessage>
              {conversation}
            </ChatCompletion>
          </AssistantMessage>
        )}
      </Inline>
    </Scope>
  );
}

if (process.env.DEBUG) {
  await LLMx.show(
    <DebugTree>
      <App />
    </DebugTree>,
    { stream: true, step: true }
  );
} else {
  await LLMx.show(<App />);
}
