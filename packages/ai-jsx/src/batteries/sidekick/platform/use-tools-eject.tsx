import { getNextConversationStep } from './conversation.js';
import { Converse } from '../../../core/conversation.js';
import { UseToolsProps } from '../../use-tools.js';

export function UseTools(props: UseToolsProps) {
  return (
    <Converse reply={(messages, fullConversation) => getNextConversationStep(messages, fullConversation, props.tools)}>
      {props.children}
    </Converse>
  );
}
