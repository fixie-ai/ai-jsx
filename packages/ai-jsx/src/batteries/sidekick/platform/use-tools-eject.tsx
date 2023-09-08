import { Node, ComponentContext } from '../../../index.js';
import { getNextConversationStep } from './conversation.js';
import { Converse } from '../../../core/conversation.js';
import { UseToolsProps } from '../../use-tools.js';

export function UseTools(
  props: UseToolsProps & { finalSystemMessageBeforeResponse: Node },
  componentContext: ComponentContext
) {
  return (
    <Converse
      reply={(messages, fullConversation) =>
        getNextConversationStep(
          messages,
          fullConversation,
          props.finalSystemMessageBeforeResponse,
          props.tools,
          componentContext
        )
      }
    >
      {props.children}
    </Converse>
  );
}
