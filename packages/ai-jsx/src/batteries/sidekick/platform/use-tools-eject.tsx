/** @jsxImportSource ai-jsx/react */

/**
 * A lot of this is copied from AI.JSX's UseTools.
 */

import { Node } from 'ai-jsx'
import { getNextConversationStep } from './conversation.js'
import { Converse } from '../../../core/conversation.js'
import { UseToolsProps } from '../../use-tools.js'

export function UseTools(
  props: UseToolsProps & { finalSystemMessageBeforeResponse: Node }
) {
  return (
    <Converse
      reply={(messages, fullConversation) =>
        getNextConversationStep(
          messages,
          fullConversation,
          props.finalSystemMessageBeforeResponse,
          props.tools
        )
      }
    >
      {props.children}
    </Converse>
  )
}
