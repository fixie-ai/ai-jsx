import { NextRequest, NextResponse } from 'next/server';
import * as PlayHT from 'playht';
import { getEnvVar } from '../../common';

const AUDIO_MPEG_MIME_TYPE = 'audio/mpeg';
let playHTInited = false;

/**
 * Calls out to the requested TTS provider to generate speech with the given parameters.
 * This sidesteps CORS and also allows us to hide the API keys from the client.
 * The returned audio data is streamed back to the client in our response.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const providerName = params.get('provider');
  const voice = params.get('voice');
  const text = params.get('text');
  const rate = params.get('rate') ? parseFloat(params.get('rate')!) : 1.0;
  if (!providerName || !voice || !text) {
    return new NextResponse(JSON.stringify({ error: 'You must specify params `provider`, `voice`, and `text`.' }), {
      status: 400,
    });
  }

  if (providerName == 'playht-grpc') {
    return ttsPlayHTGrpc(voice, rate, text);
  }
  return new NextResponse(JSON.stringify({ error: 'Unknown provider.' }), { status: 400 });
}

/**
 * GRPC client for Play.HT TTS (https://play.ht)
 */
async function ttsPlayHTGrpc(voice: string, rate: number, text: string) {
  const opts: PlayHT.SpeechStreamOptions = {
    voiceEngine: 'PlayHT2.0-turbo',
    voiceId: voice,
    outputFormat: 'mp3',
    quality: 'draft',
    speed: rate,
  };
  let controller: ReadableStreamDefaultController;
  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });
  if (!playHTInited) {
    PlayHT.init({ apiKey: getEnvVar('PLAYHT_API_KEY'), userId: getEnvVar('PLAYHT_USER_ID') });
    playHTInited = true;
  }
  const nodeStream = await PlayHT.stream(text, opts);
  nodeStream.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk)));
  nodeStream.on('end', () => controller.close());
  nodeStream.on('error', (err) => controller.error(err));
  const mimeType = AUDIO_MPEG_MIME_TYPE;
  return new NextResponse(stream, { headers: { 'Content-Type': mimeType } });
}
