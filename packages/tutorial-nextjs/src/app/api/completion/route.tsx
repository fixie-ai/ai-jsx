/** @jsxImportSource ai-jsx/react */
// The above line is important and enables the edge function to run AI.JSX code.

/**
 * This code is a Vercel Edge Function that runs an AI.JSX ChatCompletion and returns the result.
 * This is used to protect your OpenAI API key from being exposed to the client.
 * Note that the edge function must be deployed with the OPENAI_API_KEY environment variable set.
 */

import * as AI from 'ai-jsx';
import { ChatCompletion, AssistantMessage, SystemMessage, UserMessage } from 'ai-jsx/core/completion';

export const runtime = 'edge';

async function doCompletion({ userMessage, systemMessage, assistantMessage } : { userMessage: string, systemMessage: string, assistantMessage: string }) {
  const completion = (
  <ChatCompletion>
    { systemMessage && <SystemMessage>{systemMessage}</SystemMessage> }
    { userMessage && <UserMessage>{userMessage}</UserMessage> }
    { assistantMessage && <AssistantMessage>{assistantMessage}</AssistantMessage> }
  </ChatCompletion>
  );
  const renderContext = AI.createRenderContext();
  const result = await renderContext.render(completion);
  return result;
}

export async function POST(req: Request) {
  const request = await req.json();
  const userMessage = request.userMessage ?? '';
  const systemMessage = request.systemMessage ?? '';
  const assistantMessage = request.assistantMessage ?? '';

  const result = await doCompletion({ userMessage, systemMessage, assistantMessage });
  return new Response(result, { headers: { 'Content-Type': 'text/plain' } });
}