import * as AI from 'ai-jsx';
import { AssistantMessage, ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { Inline } from 'ai-jsx/core/inline';
import { showInspector } from 'ai-jsx/core/inspector';

function App() {
  return (
    <Inline>
      User: <UserMessage>Why is the sky blue?</UserMessage>
      {'\n'}
      {'\n'}
      Assistant:{' '}
      {(conversation) => (
        <AssistantMessage>
          <ChatCompletion temperature={1}>
            <SystemMessage>Be terse and use jargon.</SystemMessage>
            {conversation}
          </ChatCompletion>
        </AssistantMessage>
      )}
      {'\n\n'}
      User: <UserMessage>I don't understand.</UserMessage>
      {'\n\n'}
      Assistant:{' '}
      {(conversation) => (
        <AssistantMessage>
          <ChatCompletion temperature={1}>
            <SystemMessage>Be apologetic.</SystemMessage>
            {conversation}
          </ChatCompletion>
        </AssistantMessage>
      )}
    </Inline>
  );
}

showInspector(<App />);
