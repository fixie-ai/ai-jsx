import * as AI from 'ai-jsx';
import { InvokeAgentRequest } from './types.js';
import { ConversationHistoryContext } from 'ai-jsx/core/conversation';
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
