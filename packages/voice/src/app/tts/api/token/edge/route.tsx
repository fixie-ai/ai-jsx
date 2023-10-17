import { NextRequest, NextResponse } from 'next/server';
import { getEnvVar } from '../../common';

export const runtime = 'edge'; // 'nodejs' is the default

/**
 * Returns a temporary API key for use in a WebSocket connection to the given provider.
 * Currently, this is only configured for Eleven Labs, and even then, we're mostly
 * faking it because Eleven doesn't support temporary API keys yet.
 */
export async function POST(request: NextRequest) {
  const inJson = await request.json();
  const provider = inJson.provider as string;
  let token;
  if (provider == 'eleven') {
    token = getEnvVar('ELEVEN_API_KEY');
  } else if (provider == 'lmnt') {
    token = getEnvVar('LMNT_API_KEY');
  }
  if (!token) {
    return new NextResponse(JSON.stringify({ error: 'unknown provider' }));
  }
  return new NextResponse(JSON.stringify({ token }));
}
