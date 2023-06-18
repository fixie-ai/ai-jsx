import * as LLMx from 'ai-jsx';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';

const app = (
  <ChatCompletion>
    <UserMessage>Write a Shakespearean sonnet about AI models.</UserMessage>
  </ChatCompletion>
);

const renderContext = LLMx.createRenderContext();
const response = await renderContext.render(app);
console.log(response);
