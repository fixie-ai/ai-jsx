/** @jsxImportSource ai-jsx */
import { toStreamResponse } from 'ai-jsx/stream';
import { NextRequest } from 'next/server';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';

export async function POST(request: NextRequest) {
  const { topic } = await request.json();
  return toStreamResponse(
    <>
      A poem about {topic}:{'\n\n'}
      <ChatCompletion temperature={1}>
        <UserMessage>Write me a poem about {topic}</UserMessage>
      </ChatCompletion>
      {'\n\n'}
      Ten facts about {topic}:{'\n\n'}
      <ChatCompletion temperature={1}>
        <UserMessage>Give me ten facts about {topic}</UserMessage>
      </ChatCompletion>
    </>
  );
}
