/** @jsxImportSource ai-jsx */
import { NextRequest, NextResponse } from 'next/server';
// TODO(juberti): figure out why these packages make node unhappy
// import { Deepgram  } from "@deepgram/sdk";
// import { SpeechClient } from "@soniox/soniox-node";

type GetTokenFunction = () => Promise<string>;
interface FunctionMap {
  [key: string]: GetTokenFunction;
}

const KEY_LIFETIME_SECONDS = 300;
const FUNCTION_MAP: FunctionMap = {
  deepgram: getDeepgramToken,
  soniox: getSonioxToken,
  gladia: getGladiaToken,
  revai: getRevAIToken,
  speechmatics: getSpeechmaticsToken,
  aai: getAssemblyAIToken,
};

export async function POST(request: NextRequest) {
  const inJson = await request.json();
  const provider = inJson.provider as string;
  if (!(provider in FUNCTION_MAP)) {
    return new NextResponse(JSON.stringify({ error: 'unknown provider' }));
  }

  const func = FUNCTION_MAP[provider] as Function;
  return new NextResponse(JSON.stringify({ token: await func() }));
}

function getApiKey(keyName: string) {
  const key = process.env[keyName];
  if (!key) {
    throw new Error('API key not provided ');
  }
  return new Promise<string>((resolve) => {
    setTimeout(() => resolve(key), 0);
  });
}

function getDeepgramToken() {
  return getApiKey('DEEPGRAM_API_KEY');
  /*
  const client = new Deepgram(process.env.DEEPGRAM_API_KEY);
  const projectId = process.env.DEEPGRAM_PROJECT_ID;
  const { key } = await client.keys.create(
    projectId,
    "Ephemeral websocket key",
    ["usage:write"],
    { timeToLive: KEY_LIFETIME_SECONDS },
  );
  return key;
  */
}

function getSonioxToken() {
  return getApiKey('SONIOX_API_KEY');
  /*
  const client = new SpeechClient(process.env.SONIOX_API_KEY);
  return await client.getToken();
  */
}

function getGladiaToken() {
  return getApiKey('GLADIA_API_KEY');
}

function getRevAIToken() {
  return getApiKey('REVAI_API_KEY');
}

async function getSpeechmaticsToken() {
  const apiKey = process.env.SPEECHMATICS_API_KEY;
  const response = await fetch('https://mp.speechmatics.com/v1/api_keys?type=rt', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl: KEY_LIFETIME_SECONDS }),
  });
  const json = await response.json();
  return json.key_value;
}

async function getAssemblyAIToken() {
  const apiKey = process.env.AAI_API_KEY;
  const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
    method: 'POST',
    headers: { Authorization: `${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expires_in: KEY_LIFETIME_SECONDS }),
  });
  const json = await response.json();
  return json.token;
}
