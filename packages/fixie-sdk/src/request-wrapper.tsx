import * as AI from 'ai-jsx';
import { InvokeAgentRequest } from './types.js';
import { ShowConversation, ConversationHistoryContext } from 'ai-jsx/core/conversation';
import { Json } from './json.js';
import { FixieConversation } from './conversation.js';
import { OpenAI, OpenAIClient } from 'ai-jsx/lib/openai';
import { Anthropic, AnthropicClient } from 'ai-jsx/lib/anthropic';
import { cohereContext } from 'ai-jsx/lib/cohere';
import { FixieAPIContext } from 'ai-jsx/batteries/fixie';

export const RequestContext = AI.createContext<{
  request: InvokeAgentRequest;
  agentId: string;
} | null>(null);

/**
 * Wraps a conversational AI.JSX component to be used as a Fixie request handler.
 *
 * Emits newline-delimited JSON for each message.
 */
export function FixieRequestWrapper({ children }: { children: AI.Node }, { getContext, memo }: AI.ComponentContext) {
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
                  metadata: message.element.props.metadata,
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
                  metadata: message.element.props.metadata,
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
                  metadata: message.element.props.metadata,
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

  const { url: apiBaseUrl, authToken } = getContext(FixieAPIContext);

  // Set both OpenAI and Anthropic Clients, but set the default chat/completion models to OpenAI.
  wrappedNode = (
    <OpenAI
      client={
        new OpenAIClient({
          apiKey: authToken,
          baseURL: new URL('api/openai-proxy/v1', apiBaseUrl).toString(),
          fetch: globalThis.fetch,
        })
      }
      chatModel="gpt-3.5-turbo"
      completionModel="text-davinci-003"
    >
      {wrappedNode}
    </OpenAI>
  );

  wrappedNode = (
    <Anthropic
      client={
        new AnthropicClient({ authToken, apiKey: null, baseURL: new URL('api/anthropic-proxy', apiBaseUrl).toString() })
      }
    >
      {wrappedNode}
    </Anthropic>
  );

  // Add the Cohere client.
  wrappedNode = (
    <cohereContext.Provider
      value={{ api_key: authToken, api_url: new URL('api/cohere-proxy/v1', apiBaseUrl).toString() }}
    >
      {wrappedNode}
    </cohereContext.Provider>
  );

  return (
    <ConversationHistoryContext.Provider value={memo(<FixieConversation />)}>
      {wrappedNode}
    </ConversationHistoryContext.Provider>
  );
}
