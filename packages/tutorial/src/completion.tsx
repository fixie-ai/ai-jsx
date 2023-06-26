import * as AI from 'ai-jsx';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';

const app = (
  <ChatCompletion>
    <UserMessage>Write a Shakespearean sonnet about AI models.</UserMessage>
  </ChatCompletion>
);

const renderContext = AI.createRenderContext();
const response = await renderContext.render(app);
console.log(response);
