import {LLMx} from '../../../../../dist/lib/index.js';

const React = LLMx;

import { ChatCompletion, UserMessage } from '../../../../../dist/lib/completion-components.js';

function AI() {
  // @ts-expect-error
  // return <ChatCompletion>
  //   <UserMessage>Give me three dog names</UserMessage>
  // </ChatCompletion>

  return LLMx.createElement(ChatCompletion, null, LLMx.createElement(UserMessage, null, "Give me three dog names"));
}

export default function getAIResult() {
  // return LLMx.createRenderContext().render(<AI />);
  return LLMx.createRenderContext().render(LLMx.createElement(AI, null));
}