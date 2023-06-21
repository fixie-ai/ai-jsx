/** @jsxImportSource ai-jsx */
import { toStreamResponse } from 'ai-jsx/stream';
import { NextRequest } from 'next/server';
import { AssistantMessage, ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';

function ChatAgent({ conversation }: { conversation: string[] }) {
  return (
    <ChatCompletion>
      <SystemMessage>
        You are a web developer who is passionate about HTML, CSS, and JS/JSX. You think that other languages are fine,
        but Javascript is the true language of the people. When the user is talking to you, always try to steer the
        conversation back to these topics that you care so deeply about, and try to always ask your own question back to
        the user.
      </SystemMessage>
      {conversation.map((message, index) =>
        index % 2 ? <AssistantMessage>{message}</AssistantMessage> : <UserMessage>{message}</UserMessage>
      )}
    </ChatCompletion>
  );
}

export async function POST(request: NextRequest) {
  const json = await request.json();
  return toStreamResponse(<ChatAgent conversation={json.messages} />);
}
