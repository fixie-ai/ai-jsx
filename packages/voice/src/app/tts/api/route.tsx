/** @jsxImportSource ai-jsx */
import { NextRequest, NextResponse } from 'next/server';
import { assert } from 'console';
import _ from 'lodash';
import aws4 from 'aws4';
import * as PlayHTAPI from 'playht';

const AUDIO_MPEG_MIME_TYPE = 'audio/mpeg';
const AUDIO_WAV_MIME_TYPE = 'audio/wav';
const APPLICATION_JSON_MIME_TYPE = 'application/json';
const APPLICATION_X_WWW_FORM_URLENCODED_MIME_TYPE = 'application/x-www-form-urlencoded';

type Generate = (voiceId: string, rate: number, text: string) => Promise<Response>;
class Provider {
  constructor(public func: Generate, public keyPath?: string, public mimeType?: string) {}
}
type ProviderMap = {
  [key: string]: Provider;
};
const PROVIDER_MAP: ProviderMap = {
  aws: { func: ttsAws },
  azure: { func: ttsAzure },
  eleven: { func: ttsEleven },
  gcp: { func: ttsGcp, keyPath: 'audioContent' },
  lmnt: { func: ttsLmnt },
  murf: { func: ttsMurf, keyPath: 'encodedAudio' },
  playht: { func: ttsPlayHT },
  resemble1: { func: ttsResembleV1, keyPath: 'item.raw_audio', mimeType: AUDIO_WAV_MIME_TYPE },
  resemble: { func: ttsResembleV2 },
  wellsaid: { func: ttsWellSaid },
};

function makeStreamFromReader(startMillis: number, reader: ReadableStreamDefaultReader) {
  let firstRead = true;
  const stream = new ReadableStream({
    start(controller) {
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
  return stream;
}

function getBlobFromJson(startMillis: number, json: any, keyPath: string) {
  const value = _.get(json, keyPath);
  const binary = Buffer.from(value, 'base64');
  console.log(`${startMillis} TTS complete latency: ${(performance.now() - startMillis).toFixed(0)} ms`);
  return binary;
}

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
  if (!(providerName in PROVIDER_MAP)) {
    return new NextResponse(JSON.stringify({ error: `unknown provider ${providerName}` }), { status: 400 });
  }

  const startMillis = performance.now();
  console.log(`${startMillis} TTS for: ${providerName} ${text}`);
  if (providerName == 'playht') {
    return ttsPlayHTGrpc(voice, rate, text);
  }

  const provider = PROVIDER_MAP[providerName];
  const response = await provider.func(voice, rate, text);
  if (!response.ok) {
    console.log(await response.text());
    console.log(`${startMillis} TTS error: ${response.status} ${response.statusText}`);
    return new NextResponse(await response.json(), { status: response.status });
  }
  const contentType = response.headers.get('Content-Type');
  console.log(
    `${startMillis} TTS response latency: ${(performance.now() - startMillis).toFixed(
      0
    )} ms, content-type: ${contentType}`
  );
  if (provider.keyPath) {
    assert(contentType?.startsWith(APPLICATION_JSON_MIME_TYPE));
    const binary = await getBlobFromJson(startMillis, await response.json(), provider.keyPath);
    const mimeType = provider.mimeType ?? AUDIO_MPEG_MIME_TYPE;
    return new NextResponse(binary, { headers: { 'Content-Type': mimeType } });
  }
  const stream = makeStreamFromReader(startMillis, response.body!.getReader());
  return new NextResponse(stream, { headers: response.headers, status: response.status });
}

/**
 * Converts a decimal rate to a percent, e.g. 1.1 -> 10, 0.9 -> -10.
 */
function decimalToPercent(decimal: number) {
  return Math.round((decimal - 1.0) * 100);
}

function makeSsml(voice: string, rate: number, text: string) {
  return `
  <speak version="1.0" xml:lang="en-US">
    <voice xml:lang="en-US" name="${voice}">
      <prosody rate="${decimalToPercent(rate)}%">${text}</prosody>
    </voice>
  </speak>`;
}

/**
 * REST client for Eleven Labs TTS. (https://elevenlabs.io)
 */
function ttsEleven(voiceId: string, rate: number, text: string) {
  const headers = createHeaders();
  headers.append('xi-api-key', getEnvVar('ELEVEN_API_KEY'));
  const obj = {
    text,
    model_id: 'eleven_monolingual_v1',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.5,
    },
  };
  const latencyMode = 22;
  const url: string = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=${latencyMode}`;
  return postJson(url, headers, obj);
}

/**
 * REST client for Azure TTS.
 */
function ttsAzure(voice: string, rate: number, text: string) {
  const region = 'westus';
  const apiKey = getEnvVar('AZURE_TTS_API_KEY');
  const outputFormat = 'audio-24khz-48kbitrate-mono-mp3';
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const headers = createHeaders({});
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
      'Content-Type': APPLICATION_JSON_MIME_TYPE,
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

/**
 * REST client for GCP TTS.
 */
function ttsGcp(voice: string, rate: number, text: string) {
  const headers = createHeaders({ accept: APPLICATION_JSON_MIME_TYPE });
  const obj = {
    input: { text },
    voice: { languageCode: 'en-US', name: voice },
    audioConfig: { audioEncoding: 'MP3', speakingRate: rate },
  };
  const apiKey = getEnvVar('GOOGLE_TTS_API_KEY');
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
  return postJson(url, headers, obj);
}

/**
 * REST client for WellSaid TTS.
 */
function ttsWellSaid(voice: string, rate: number, text: string) {
  const headers = createHeaders({ x_api_key: getEnvVar('WELLSAID_API_KEY') });
  const obj = {
    speaker_id: voice,
    text,
  };
  const url = 'https://api.wellsaidlabs.com/v1/tts/stream';
  return postJson(url, headers, obj);
}

/**
 * REST client for Murf.ai TTS.
 */
function ttsMurf(voice: string, rate: number, text: string) {
  const headers = createHeaders({ api_key: getEnvVar('MURF_API_KEY'), accept: APPLICATION_JSON_MIME_TYPE });
  const obj = {
    voiceId: voice,
    style: 'Conversational',
    text,
    rate: decimalToPercent(rate),
    sampleRate: 24000,
    format: 'MP3',
    encodeAsBase64: true,
  };
  const url = 'https://api.murf.ai/v1/speech/generate-with-key';
  return postJson(url, headers, obj);
}

/**
 * REST client for Play.HT TTS (https://play.ht)
 */
function ttsPlayHT(voice: string, rate: number, text: string) {
  const headers = createHeaders({ authorization: makeAuth('PLAYHT_API_KEY') });
  headers.append('X-User-Id', getEnvVar('PLAYHT_USER_ID'));
  const obj = {
    voice,
    text,
    quality: 'draft',
    output_format: 'mp3',
    speed: rate,
    sample_rate: 24000,
  };
  const url = 'https://play.ht/api/v2/tts/stream';
  return postJson(url, headers, obj);
}

/**
 * GRPC client for Play.HT TTS (https://play.ht)
 */
async function ttsPlayHTGrpc(voice: string, rate: number, text: string) {
  const opts: PlayHTAPI.SpeechStreamOptions = {
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
  PlayHTAPI.init({ apiKey: getEnvVar('PLAYHT_API_KEY'), userId: getEnvVar('PLAYHT_USER_ID') });
  const nodeStream = await PlayHTAPI.stream(text, opts);
  nodeStream.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk)));
  nodeStream.on('end', () => controller.close());
  nodeStream.on('error', (err) => controller.error(err));
  const mimeType = AUDIO_MPEG_MIME_TYPE;
  return new NextResponse(stream, { headers: { 'Content-Type': mimeType } });
}

/**
 * REST client for Resemble.AI TTS (https://www.resemble.ai)
 */
function ttsResembleV1(voice: string, rate: number, text: string) {
  const headers = createHeaders({
    authorization: makeAuth('RESEMBLE_API_KEY'),
    accept: APPLICATION_JSON_MIME_TYPE,
  });
  const obj = {
    body: text, // makeSsml(voice, rate, text),
    voice_uuid: voice,
    precision: 'PCM_16',
    sample_rate: 44100,
    output_type: 'mp3',
    raw: true,
  };
  const url = `https://app.resemble.ai/api/v2/projects/${getEnvVar('RESEMBLE_PROJECT_ID')}/clips`;
  return postJson(url, headers, obj);
}

/**
 * Streaming REST client for Resemble.AI TTS (https://www.resemble.ai)
 */
function ttsResembleV2(voice: string, rate: number, text: string) {
  const headers = createHeaders({ authorization: makeAuth('RESEMBLE_API_KEY'), accept: AUDIO_WAV_MIME_TYPE });
  const obj = {
    project_uuid: getEnvVar('RESEMBLE_PROJECT_ID'),
    voice_uuid: voice,
    // eslint-disable-next-line id-blacklist
    data: text, // makeSsml(voice, rate, text),
    precision: 'PCM_16',
    sample_rate: 44100,
  };
  const url = 'https://p.cluster.resemble.ai/stream';
  return postJson(url, headers, obj);
}

/**
 * Streaming REST client for LMNT TTS (https://www.lmnt.com)
 */
function ttsLmnt(voice: string, rate: number, text: string) {
  const headers = createHeaders({ x_api_key: getEnvVar('LMNT_API_KEY') });
  const obj = new URLSearchParams({
    voice,
    text,
    speed: rate.toString(),
    format: 'mp3', // || "wav"
  });
  const url = 'https://api.lmnt.com/speech/beta/synthesize';
  return postForm(url, headers, obj);
}

interface TtsHeaders {
  authorization?: string;
  api_key?: string;
  x_api_key?: string;
  accept?: string;
}

/**
 * Helper to create the basic headers for a service that accepts JSON and returns audio/mpeg.
 */
function createHeaders({ authorization, api_key, x_api_key, accept }: TtsHeaders = {}) {
  const headers = new Headers();
  if (authorization) {
    headers.append('Authorization', authorization);
  }
  if (api_key) {
    headers.append('Api-Key', api_key);
  }
  if (x_api_key) {
    headers.append('X-Api-Key', x_api_key);
  }
  headers.append('Accept', accept ?? AUDIO_MPEG_MIME_TYPE);
  return headers;
}

function makeAuth(keyName: string) {
  return `Bearer ${getEnvVar(keyName)}`;
}

/**
 * Helper to send a POST request with JSON body.
 */
function postJson(url: string, headers: Headers, body: Object) {
  headers.append('Content-Type', APPLICATION_JSON_MIME_TYPE);
  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

/**
 * Helper to send a POST request with URL-encoded body.
 */
function postForm(url: string, headers: Headers, body: URLSearchParams) {
  headers.append('Content-Type', APPLICATION_X_WWW_FORM_URLENCODED_MIME_TYPE);
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

function getEnvVar(keyName: string) {
  const key = process.env[keyName];
  if (!key) {
    throw new Error(`API key "${keyName}" not provided. Please set it as an env var.`);
  }
  return key;
}
