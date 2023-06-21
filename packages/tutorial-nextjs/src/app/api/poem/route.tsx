/** @jsxImportSource ai-jsx */
// The above line is important and enables the edge function to run AI.JSX code.

/**
 * This code is a Vercel Edge Function that runs a simple AI.JSX ChatCompletion and streams the result.
 * This prevents your OpenAI API key from being exposed to the client.
 * Note that the edge function must be deployed with the OPENAI_API_KEY environment variable set.
 */

import { toStreamResponse } from 'ai-jsx/stream';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { topic } = await req.json();

  return toStreamResponse(
    <ChatCompletion>
      <SystemMessage>
        You are an assistant who writes poems. If the user asks for anything else, politely decline.
      </SystemMessage>
      <UserMessage>Write a poem about {topic}</UserMessage>
    </ChatCompletion>
  );
}
