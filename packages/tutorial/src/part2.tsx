import * as LLMx from 'ai-jsx';
import { Inline } from 'ai-jsx/core/inline';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';
import { showInspector } from 'ai-jsx/core/inspector';

const app = (
  <Inline>
    <ChatCompletion>
      <UserMessage>Come up with the name of a mythical forest animal.</UserMessage>
    </ChatCompletion>
    {'\n\n'}
    {(conversation) => (
      <ChatCompletion>
        <UserMessage>Now write a poem about this animal: {conversation}</UserMessage>
      </ChatCompletion>
    )}
  </Inline>
);

showInspector(app);
