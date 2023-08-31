/** @jsxImportSource ai-jsx */
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const provider = params.get("provider");
  const voice = params.get("voice");
  const text = params.get("text");
  const rate = params.get("rate") ? parseFloat(params.get("rate")) : 1.0;
  let response = null;
  if (provider == "eleven") {
    response = await ttsEleven(voice, rate, text);
  } else if (provider == "azure") {
    response = await ttsAzure(voice, rate, text);
  }

  if (!response) {
    return new NextResponse(JSON.stringify({ error: "unknown provider" }));
  }

  const headers = response.headers;
  const status = response.status;
  const nextStream = new ReadableStream({
    start(controller) {
      const reader = response.body.getReader();
      function read() {
        reader.read().then(({ done, value }) => {
          if (done) {
            controller.close();
            return;
          }
          controller.enqueue(value);
          read();
        });
      }
      read();
    },
  });
  return new NextResponse(nextStream, { headers, status });
}

function makeSsml(voice: string, rate: number, text: string) {
  return `
  <speak version="1.0" xml:lang="en-US">
    <voice xml:lang="en-US" name="${voice}">
      <prosody rate="${Math.round((rate - 1.0) * 100)}%">${text}</prosody>
    </voice>
  </speak>`;
}

function ttsEleven(voiceId: string, rate: number, text: string) {
  const latencyMode = 22;
  const apiKey: string = "ea97927d6adcead9be58ade42dbfd13b";
  const url: string = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=${latencyMode}`;
  const headers: HeadersInit = {
    Accept: "audio/mpeg",
    "xi-api-key": apiKey,
    "Content-Type": "application/json",
  };
  const body: string = JSON.stringify({
    text: text,
    model_id: "eleven_monolingual_v1",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.5,
    },
  });
  return fetch(url, {
    method: "POST",
    headers,
    body,
  });
}

function ttsAzure(voice: string, rate: number, text: string) {
  const region = "westus";
  const apiKey = "9b7bfb63adb24c6abe13afce394562b5";
  const outputFormat = "audio-24khz-48kbitrate-mono-mp3";
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const headers = new Headers();
  headers.append("Ocp-Apim-Subscription-Key", apiKey);
  headers.append("Content-Type", "application/ssml+xml");
  headers.append("X-Microsoft-OutputFormat", outputFormat);
  headers.append("User-Agent", "MyTTS");
  return fetch(url, {
    method: "POST",
    headers,
    body: makeSsml(voice, rate, text),
  });
}

async function ttsAws(voice: string, rate: number, text: string) {
  const region = "us-west-2";
  const outputFormat = "mp3";
  const queryParams = new URLSearchParams({
    Text: text,
    OutputFormat: outputFormat,
    VoiceId: voice,
  });
  const url = `https://polly.${region}.amazonaws.com/v1/speech?${queryParams.toString()}`;
  const headers = new Headers();
  return await fetch(url, { headers });
}
