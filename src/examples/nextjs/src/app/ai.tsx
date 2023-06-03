import {LLMx} from '../../../../../dist/lib/index.js';
import React from './react'

import { ChatCompletion, UserMessage } from '../../../../../dist/lib/completion-components.js';

export function DogNames() {
  // @ts-expect-error
  return <ChatCompletion temperature={1}>
    <UserMessage>Give me three dog names</UserMessage>
  </ChatCompletion>
}

export function AI({children}: {children: React.ReactNode}) {
  return <React.Fragment>{LLMx.createRenderContext().render(children)}</React.Fragment>;
}