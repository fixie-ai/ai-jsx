/** @jsxImportSource ai-jsx */
import { NextRequest, NextResponse } from 'next/server';
// TODO(juberti): figure out why this packages make node unhappy
//import { Deepgram  } from "@deepgram/sdk";
//import { SpeechClient } from "@soniox/soniox-node";

const KEY_LIFETIME_SECONDS = 300;

export async function POST(request: NextRequest) {
  const inJson = await request.json();
  const provider = inJson.provider;
  let token = null;
  if (provider == 'aai') {
    token = await getAssemblyAIToken();
  } else if (provider == 'soniox') {
    token = await getSonioxToken();
  } else if (provider == 'deepgram') {
    token = await getDeepgramToken();
  } else if (provider == 'gladia') {
    token = await getGladiaToken();
  } else {
    return new NextResponse(JSON.stringify({ error: 'unknown provider' }));
  }
  console.log('token' + token);
  return new NextResponse(JSON.stringify({ token }));
}

async function getDeepgramToken() {
  return process.env.DEEPGRAM_API_KEY;
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

async function getSonioxToken() {
  //const client = new SpeechClient(process.env.SONIOX_API_KEY);
  //return await client.getToken();
  return process.env.SONIOX_API_KEY;
}

async function getGladiaToken() {
  return process.env.GLADIA_API_KEY;
}

async function getAssemblyAIToken() {
  const apiKey = process.env.AAI_API_KEY;
  const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
    method: 'POST',
    headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expires_in: KEY_LIFETIME_SECONDS }),
  });
  const { token } = await response.json();
  return token;
}
