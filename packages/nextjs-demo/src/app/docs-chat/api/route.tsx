/** @jsxImportSource ai-jsx */
import { toStreamResponse } from 'ai-jsx/stream';
import { NextRequest } from 'next/server';
import { DocsAgent } from './ai.tsx';  

export async function POST(request: NextRequest) {
  const json = await request.json();
  return toStreamResponse(
    <DocsAgent question={json.message} />
  );
}
