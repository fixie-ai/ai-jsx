import { Inline } from 'ai-jsx/core/inline';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';
import { showInspector } from 'ai-jsx/core/inspector';

const app = (
  <Inline>
    {'This is an AI.JSX demo application that generates a poem about a mythical forest animal.'}
    {'\n\n'}
    {'Come up with the name of a mythical forest animal: '}
    <ChatCompletion>
      <UserMessage>Come up with the name of a mythical forest animal.</UserMessage>
    </ChatCompletion>
    {'\n\n'}
    {(conversation) => (
      <ChatCompletion>
        <UserMessage>Imagine a mythical forest animal called the "{conversation}". Tell me more about it.</UserMessage>
      </ChatCompletion>
    )}
    {'\n\n'}
    {'Now, write a poem about it: '}
    {'\n\n'}
    {(conversation) => (
      <ChatCompletion>
        <UserMessage>Now write a poem about this animal: {conversation}</UserMessage>
      </ChatCompletion>
    )}
  </Inline>
);

showInspector(app);
