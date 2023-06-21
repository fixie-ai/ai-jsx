/** @jsxImportSource ai-jsx */
import { toStreamResponse } from 'ai-jsx/stream';
import { NextRequest } from 'next/server';
import { DocsAgent } from './ai';

export async function POST(request: NextRequest) {
  const json = await request.json();
  const question = json.messages[json.messages.length - 1];
  return toStreamResponse(<DocsAgent question={question} />);
}
