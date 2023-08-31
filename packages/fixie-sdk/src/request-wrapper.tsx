import * as AI from 'ai-jsx';
import { InvokeAgentRequest } from './types.js';
import { ShowConversation, ConversationHistoryContext } from 'ai-jsx/core/conversation';
import { Json } from './json.js';
import { FixieConversation } from './conversation.js';
import { OpenAI, OpenAIClient, ValidChatModel } from 'ai-jsx/lib/openai';

export interface FixieRequestContext {
  request: InvokeAgentRequest;
  agentId: string;
  apiBaseUrl: string;
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
  apiBaseUrl,
  authToken,
  children,
}: FixieRequestContext & {
  children: AI.Node;
}) {
  let wrappedNode: AI.Node = (
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
                  response: <>{message.element.props.children}</>,
                }}
              </Json>,
              '\n',
            ];
        }
      }}
    >
      {children}
    </ShowConversation>
  );

  // If we're using OpenAI (or default), enable the OpenAI proxy.
  if (!request.generationParams.modelProvider || request.generationParams.modelProvider.toLowerCase() === 'openai') {
    wrappedNode = (
      <OpenAI
        client={
          new OpenAIClient({
            apiKey: authToken,
            baseURL: new URL('api/openai-proxy/v1', apiBaseUrl).toString(),
            fetch: globalThis.fetch,
          })
        }
        chatModel={(request.generationParams.model as ValidChatModel | undefined) ?? 'gpt-3.5-turbo'}
      >
        {wrappedNode}
      </OpenAI>
    );
  } else {
    throw new Error(`The model provider ("${request.generationParams.modelProvider}") is not supported.`);
  }

  return (
    <fixieContext.Provider value={{ request, agentId, authToken, apiBaseUrl }}>
      <ConversationHistoryContext.Provider value={<FixieConversation />}>
        {wrappedNode}
      </ConversationHistoryContext.Provider>
    </fixieContext.Provider>
  );
}
