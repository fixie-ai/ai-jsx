import { LLMx } from '../lib';
import { ChatCompletion, SystemMessage, UserMessage } from '../lib/completion-components';
import { DebugTree } from '../lib/debug';
import { Inline, Scope } from '../lib/inline';

function App() {
  return (
    <Scope>
      User: <UserMessage>Why is the sky blue?</UserMessage>
      {'\n'}
      {'\n'}
      Assistant:{' '}
      <Inline tag={ChatCompletion} insert="after" temperature={1.0}>
        <SystemMessage>Be terse and use jargon.</SystemMessage>
      </Inline>
      {'\n'}
      {'\n'}
      User: <UserMessage>I don't understand.</UserMessage>
      {'\n'}
      {'\n'}
      Assistant:{' '}
      <Inline tag={ChatCompletion} insert="after" temperature={1.0}>
        <SystemMessage>Be apologetic.</SystemMessage>
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
