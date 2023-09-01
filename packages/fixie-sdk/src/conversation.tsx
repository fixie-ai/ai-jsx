/// <reference lib="dom" />
import * as AI from 'ai-jsx';
import { GetConversationResponse } from './types.js';
import { AssistantMessage, FunctionCall, FunctionResponse, UserMessage } from 'ai-jsx/core/conversation';
import { fixieContext } from './request-wrapper.js';

export async function FixieConversation(_: {}, { getContext }: AI.ComponentContext) {
  const fixieContextValue = getContext(fixieContext);
  if (!fixieContextValue) {
    throw new Error('FixieConversation components may only be used in the context of requests from Fixie.');
  }

  const response = await fetch(
    new URL(
      `/api/v1/agents/${fixieContextValue.agentId}/conversations/${fixieContextValue.request.conversationId}`,
      fixieContextValue.apiBaseUrl
    ),
    { headers: { Authorization: `Bearer ${fixieContextValue.authToken}` } }
  );

  const json: GetConversationResponse = await response.json();

  // If we're replying to a specific message, trim the history to exclude everything after that message.
  const replyToTurnId = fixieContextValue.request.replyToTurnId;
  let turns = json.turns;
  if (replyToTurnId) {
    const index = turns.findIndex((turn) => turn.id === replyToTurnId);
    if (index >= 0) {
      turns = turns.slice(0, index + 1);
    }
  }

  return turns.flatMap((turn) =>
    turn.messages.map((message) => {
      switch (message.kind) {
        case 'text':
          return turn.role === 'assistant' ? (
            <AssistantMessage>{message.content}</AssistantMessage>
          ) : (
            <UserMessage>{message.content}</UserMessage>
          );
        case 'functionCall':
          return <FunctionCall name={message.name} args={message.args} />;
        case 'functionResponse':
          return (
            <FunctionResponse name={message.name} failed={message.failed}>
              {message.response}
            </FunctionResponse>
          );
        default:
          throw new Error(`Unknown message kind: ${(message as any).kind}`);
      }
    })
  );
}
