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
 * Renders to "in-progress" while `children` is still being rendered, and "done" when it's done.
 *
 * `children` should already be memoized to ensure that it's only rendered once.
 *
 * To ensure that this component renders consistently with `children`, a render containing both
 * nodes MUST use frame batching. Without it, there will be frames where the result of this component
 * will be inconsistent with the component whose rendering it's tracking.
 */
async function* MessageState({ children }: { children: AI.Node }, { render }: AI.ComponentContext) {
  const renderResult = render(children);
  let didYield = false;
  for await (const _ of renderResult) {
    if (!didYield) {
      didYield = true;
      yield 'in-progress';
    }
  }

  return 'done';
}

/**
 * Wraps a conversational AI.JSX component to be used as a Fixie request handler.
 *
 * Emits newline-delimited JSON for each message.
 */
export function FixieRequestWrapper({
  children,
  fixieApiUrl,
  fixieAuthToken,
  request,
  agentId,
}: {
  children: AI.Node;
  fixieApiUrl: string;
  fixieAuthToken: string;
  agentId: string;
  request: InvokeAgentRequest;
}) {
  let wrappedNode = children;

  wrappedNode = (
    <ConversationHistoryContext.Provider value={<FixieConversation />}>
      {wrappedNode}
    </ConversationHistoryContext.Provider>
  );

  wrappedNode = (
    <ShowConversation
      present={(message) => {
        switch (message.type) {
          case 'user':
          case 'assistant':
            return [
              <Json>
                {{
                  kind: 'text',
                  state: <MessageState>{message.element}</MessageState>,
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
                  id: message.element.props.id,
                  partial: message.element.props.partial,
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
                  id: message.element.props.id,
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
      {wrappedNode}
    </ShowConversation>
  );

  // Set both OpenAI and Anthropic Clients, but set the default chat/completion models to OpenAI.
  wrappedNode = (
    <OpenAI
      client={
        new OpenAIClient({
          apiKey: fixieAuthToken,
          baseURL: new URL('api/openai-proxy/v1', fixieApiUrl).toString(),
          fetch: globalThis.fetch as any,
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
        new AnthropicClient({
          authToken: fixieAuthToken,
          apiKey: null,
          baseURL: new URL('api/anthropic-proxy', fixieApiUrl).toString(),
        })
      }
    >
      {wrappedNode}
    </Anthropic>
  );

  // Add the Cohere client.
  wrappedNode = (
    <cohereContext.Provider
      value={{ api_key: fixieAuthToken, api_url: new URL('api/cohere-proxy/v1', fixieApiUrl).toString() }}
    >
      {wrappedNode}
    </cohereContext.Provider>
  );

  wrappedNode = <RequestContext.Provider value={{ request, agentId }}>{wrappedNode}</RequestContext.Provider>;

  wrappedNode = (
    <FixieAPIContext.Provider value={{ url: fixieApiUrl, authToken: fixieAuthToken }}>
      {wrappedNode}
    </FixieAPIContext.Provider>
  );

  return wrappedNode;
}
