import {LLMx as React} from '../../../../../dist/lib/index.js';
import {LLMx} from '../../../../../dist/lib/index.js';

import { ChatCompletion, UserMessage } from '../../../../../dist/lib/completion-components.js';

function AI() {
  // @ts-expect-error
  return <ChatCompletion temperature={1}>
    <UserMessage>Give me three dog names</UserMessage>
  </ChatCompletion>
}

export default function getAIResult() {
  return LLMx.createRenderContext().render(<AI />);
}