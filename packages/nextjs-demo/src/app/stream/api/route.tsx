/** @jsxImportSource ai-jsx */
import { toStreamResponse } from 'ai-jsx/stream';
import { NextRequest } from 'next/server';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';

export async function POST(request: NextRequest) {
  const json = await request.json();
  return toStreamResponse(
    <ChatCompletion>
      <UserMessage>Write a haiku about {json.topic ?? 'foxes'}.</UserMessage>
    </ChatCompletion>
  );
}
