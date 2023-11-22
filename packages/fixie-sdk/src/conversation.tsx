/// <reference lib="dom" />
import * as AI from 'ai-jsx';
import { Conversation, ConversationTurn } from './types.js';
import { AssistantMessage, FunctionCall, FunctionResponse, UserMessage } from 'ai-jsx/core/conversation';
import { RequestContext } from './request-wrapper.js';
import { FixieAPIContext } from 'ai-jsx/batteries/fixie';

export async function FixieConversation(_: {}, { getContext }: AI.ComponentContext) {
  const fixieApiContextValue = getContext(FixieAPIContext);
  const fixieContextValue = getContext(RequestContext);
  if (!fixieContextValue) {
    throw new Error('FixieConversation components may only be used in the context of requests from Fixie.');
  }

  let turns: ConversationTurn[];
  if (fixieContextValue.request.conversation) {
    turns = fixieContextValue.request.conversation.turns;
  } else {
    const response = await fetch(
      new URL(
        `/api/v1/agents/${fixieContextValue.agentId}/conversations/${fixieContextValue.request.conversationId}`,
        fixieApiContextValue.url
      ),
      { headers: { Authorization: `Bearer ${fixieApiContextValue.authToken}` } }
    );

    const json: Conversation = await response.json();

    // If we're replying to a specific message, trim the history to exclude everything after that message.
    const replyToTurnId = fixieContextValue.request.replyToTurnId;
    turns = json.turns;
    if (replyToTurnId) {
      const index = turns.findIndex((turn) => turn.id === replyToTurnId);
      if (index >= 0) {
        turns = turns.slice(0, index + 1);
      }
    }
  }

  return turns.flatMap((turn) =>
    turn.messages.map((message) => {
      switch (message.kind) {
        case 'text':
          return turn.role === 'assistant' ? (
            <AssistantMessage metadata={message.metadata}>{message.content}</AssistantMessage>
          ) : (
            <UserMessage metadata={message.metadata}>{message.content}</UserMessage>
          );
        case 'functionCall':
          return (
            <FunctionCall
              id={message.id}
              partial={message.partial}
              name={message.name}
              args={message.args}
              metadata={message.metadata}
            />
          );
        case 'functionResponse':
          return (
            <FunctionResponse id={message.id} name={message.name} failed={message.failed} metadata={message.metadata}>
              {message.response}
            </FunctionResponse>
          );
        default:
          throw new Error(`Unknown message kind: ${(message as any).kind}`);
      }
    })
  );
}
