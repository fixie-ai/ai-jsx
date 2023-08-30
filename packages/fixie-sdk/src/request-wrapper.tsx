import * as AI from 'ai-jsx';
import { InvokeAgentRequest } from './types.js';
import { ShowConversation, ConversationHistoryContext } from 'ai-jsx/core/conversation';
import { Json } from './json.js';
import { FixieConversation } from './conversation.js';

export interface FixieRequestContext {
  request: InvokeAgentRequest;
  agentId: string;
  fixieApiHost: string;
  authToken: string;
}

export const fixieContext = AI.createContext<FixieRequestContext | null>(null);

/**
 * Wraps a conversational AI.JSX component to be used as a Fixie request handler.
 *
 * Emits newline-delimited JSON for each message.
 */
export function FixieRequestWrapper({
  request,
  agentId,
  fixieApiHost,
  authToken,
  children,
}: FixieRequestContext & {
  children: AI.Node;
}) {
  return (
    <fixieContext.Provider value={{ request, agentId, authToken, fixieApiHost }}>
      <ConversationHistoryContext.Provider value={<FixieConversation />}>
        <ShowConversation
          present={(message) => {
            switch (message.type) {
              case 'user':
              case 'assistant':
                return [
                  <Json>
                    {{
                      kind: 'text',
                      content: message.element,
                    }}
                  </Json>,
                  '\n',
                ];
              case 'system':
                return null;
              case 'functionCall':
                return [
                  <Json>
                    {{
                      kind: 'functionCall',
                      name: message.element.props.name,
                      args: message.element.props.args,
                    }}
                  </Json>,
                  '\n',
                ];
              case 'functionResponse':
                return [
                  <Json>
                    {{
                      kind: 'functionResponse',
                      name: message.element.props.name,
                      response: message.element.props.children,
                    }}
                  </Json>,
                  '\n',
                ];
            }
          }}
        >
          {children}
        </ShowConversation>
      </ConversationHistoryContext.Provider>
    </fixieContext.Provider>
  );
}
