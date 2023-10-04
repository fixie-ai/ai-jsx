import { getNextConversationStep } from './conversation.js';
import { Converse } from '../../../core/conversation.js';
import { UseToolsProps } from '../../use-tools.js';
import { SetOptional } from 'type-fest';

export function UseTools(props: SetOptional<UseToolsProps, 'tools'>) {
  return (
    <Converse reply={(messages, fullConversation) => getNextConversationStep(messages, fullConversation, props.tools)}>
      {props.children}
    </Converse>
  );
}
