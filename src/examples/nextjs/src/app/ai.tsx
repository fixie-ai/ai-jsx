import {LLMx} from '../../../../lib/index.js';

const React = LLMx;

import { ChatCompletion, UserMessage } from '../../../../lib/completion-components.js';

function AI() {
  return <ChatCompletion>
    <UserMessage>Give me three dog names</UserMessage>
  </ChatCompletion>
}

export default function getAIResult() {
  return LLMx.createRenderContext().render(<AI />);
}