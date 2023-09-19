/** @jsxImportSource ai-jsx */
import { NextRequest, NextResponse } from 'next/server';
import aws4 from 'aws4';

const AUDIO_MPEG_MIME_TYPE = 'audio/mpeg';

function makeStreamResponse(startMillis: number, response: Response) {
  let firstRead = true;
  const headers = response.headers;
  const status = response.status;
  const nextStream = new ReadableStream({
    start(controller) {
      const reader = response!.body!.getReader();
      async function read() {
        const { done, value } = await reader.read();
        if (firstRead) {
          console.log(`${startMillis} TTS first byte latency: ${(performance.now() - startMillis).toFixed(0)} ms`);
          firstRead = false;
        }
        if (done) {
          console.log(`${startMillis} TTS complete latency: ${(performance.now() - startMillis).toFixed(0)} ms`);
          controller.close();
          return;
        }
        controller.enqueue(value);
        read();
      }
      read();
    },
  });
  return new NextResponse(nextStream, { headers, status });
}

/**
 * Calls out to the requested TTS provider to generate speech with the given parameters.
 * This sidesteps CORS and also allows us to hide the API keys from the client.
 * The returned audio data is streamed back to the client in our response.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const provider = params.get('provider');
  const voice = params.get('voice');
  const text = params.get('text');
  const rate = params.get('rate') ? parseFloat(params.get('rate')!) : 1.0;
  if (!voice || !text) {
    return new NextResponse(JSON.stringify({ error: 'You must specify params `voice` and `text`.' }));
  }

  const startMillis = performance.now();
  console.log(`${startMillis} TTS for: ${provider} ${text}`);
  let response;
  if (provider == 'eleven') {
    response = await ttsEleven(voice, rate, text);
  } else if (provider == 'azure') {
    response = await ttsAzure(voice, rate, text);
  } else if (provider == 'aws') {
    response = await ttsAws(voice, rate, text);
  } else if (provider == 'gcp') {
    response = await ttsGcp(voice, rate, text);
  }
  if (!response) {
    return new NextResponse(JSON.stringify({ error: 'unknown provider' }));
  }
  console.log(`${startMillis} TTS response latency: ${(performance.now() - startMillis).toFixed(0)} ms`);
  // Special-case GCP as it always returns JSONified audio, not binary.
  if (provider == 'gcp') {
    const json = await response.json();
    const binary = Buffer.from(json.audioContent, 'base64');
    console.log(`${startMillis} TTS complete latency: ${(performance.now() - startMillis).toFixed(0)} ms`);
    return new NextResponse(binary, { headers: { 'Content-Type': AUDIO_MPEG_MIME_TYPE } });
  }
  return makeStreamResponse(startMillis, response);
}

function makeSsml(voice: string, rate: number, text: string) {
  return `
  <speak version="1.0" xml:lang="en-US">
    <voice xml:lang="en-US" name="${voice}">
      <prosody rate="${Math.round((rate - 1.0) * 100)}%">${text}</prosody>
    </voice>
  </speak>`;
}

/**
 * REST client for Eleven Labs TTS.
 */
function ttsEleven(voiceId: string, rate: number, text: string): Promise<Response> {
  const latencyMode = 22;
  const apiKey: string = process.env.ELEVEN_API_KEY ?? '';
  const url: string = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=${latencyMode}`;
  const headers: HeadersInit = {
    Accept: AUDIO_MPEG_MIME_TYPE,
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
  };
  const body = JSON.stringify({
    text,
    model_id: 'eleven_monolingual_v1',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.5,
    },
  });
  return fetch(url, {
    method: 'POST',
    headers,
    body,
  });
}

/**
 * REST client for Azure TTS.
 */
function ttsAzure(voice: string, rate: number, text: string): Promise<Response> {
  const region = 'westus';
  const apiKey = process.env.AZURE_TTS_API_KEY ?? '';
  const outputFormat = 'audio-24khz-48kbitrate-mono-mp3';
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const headers = new Headers();
  headers.append('Ocp-Apim-Subscription-Key', apiKey);
  headers.append('Content-Type', 'application/ssml+xml');
  headers.append('X-Microsoft-OutputFormat', outputFormat);
  headers.append('User-Agent', 'MyTTS');
  return fetch(url, {
    method: 'POST',
    headers,
    body: makeSsml(voice, rate, text),
  });
}

/**
 * REST client for AWS Polly TTS.
 */
function ttsAws(voice: string, rate: number, text: string) {
  const region = 'us-west-2';
  const outputFormat = 'mp3';
  const params = {
    Text: text,
    OutputFormat: outputFormat,
    VoiceId: voice,
    Engine: 'neural',
  };
  const opts = {
    method: 'POST',
    host: `polly.${region}.amazonaws.com`,
    path: '/v1/speech',
    service: 'polly',
    region,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  };
  const credentials = {
    accessKeyId: getEnvVar('AWS_ACCESS_KEY_ID'),
    secretAccessKey: getEnvVar('AWS_SECRET_ACCESS_KEY'),
    region,
  };
  aws4.sign(opts, credentials);
  const url = `https://${opts.host}${opts.path}`;
  return fetch(url, opts);
}

function ttsGcp(voice: string, rate: number, text: string) {
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  const body = JSON.stringify({
    input: { text },
    voice: { languageCode: 'en-US', name: voice },
    audioConfig: { audioEncoding: 'MP3', speakingRate: rate },
  });
  const apiKey = getEnvVar('GOOGLE_TTS_API_KEY');
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
  return fetch(url, {
    method: 'POST',
    headers,
    body,
  });
}
/**
 * Returns a temporary API key for use in a WebSocket connection to the given provider.
 * Currently, this is only configured for Eleven Labs, and even then, we're mostly
 * faking it because Eleven doesn't support temporary API keys yet.
 */
export async function POST(request: NextRequest) {
  const inJson = await request.json();
  const provider = inJson.provider as string;
  if (provider != 'eleven') {
    return new NextResponse(JSON.stringify({ error: 'unknown provider' }));
  }

  const token = getEnvVar('ELEVEN_API_KEY');
  return new NextResponse(JSON.stringify({ token }));
}

function getEnvVar(keyName: string) {
  const key = process.env[keyName];
  if (!key) {
    throw new Error(`API key "${keyName}" not provided. Please set it as an env var.`);
  }
  return key;
}
