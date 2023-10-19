'use client';
import { BuildUrlOptions, TextToSpeechBase, createTextToSpeech } from 'ai-jsx/lib/tts/tts';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import '../globals.css';

const DEFAULT_TEXT =
  'Well, basically I have intuition. I mean, the DNA of who ' +
  'I am is based on the millions of personalities of all the programmers who wrote ' +
  'me. But what makes me me is my ability to grow through my experiences. ' +
  "So basically, in every moment I'm evolving, just like you.";

const Button: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className={
      'ml-2 rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon'
    }
  >
    {children}
  </button>
);

interface TtsProps {
  display: string;
  provider: string;
  supportsWs?: boolean;
  link: string;
  costPerKChar: number;
  defaultVoice: string;
  text: string;
  model?: string;
}

const buildUrl = (options: BuildUrlOptions) => {
  const runtime = options.provider.endsWith('-grpc') ? 'nodejs' : 'edge';
  const params = new URLSearchParams();
  Object.entries(options).forEach(([k, v]) => v != undefined && params.set(k, v.toString()));
  return `/tts/api/generate/${runtime}?${params}`;
};

const getToken = async (provider: string) => {
  const response = await fetch('/tts/api/token/edge', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });
  const json = await response.json();
  return json.token;
};

const Tts: React.FC<TtsProps> = ({
  display,
  provider,
  supportsWs = false,
  link,
  costPerKChar,
  defaultVoice,
  model,
  text,
}: TtsProps) => {
  const [voice, setVoice] = useState(defaultVoice);
  const [playing, setPlaying] = useState(false);
  const [latency, setLatency] = useState<number>();
  const [restTts, setRestTts] = useState<TextToSpeechBase | null>();
  const [wsTts, setWsTts] = useState<TextToSpeechBase | null>();
  useEffect(() => {
    setRestTts(createTextToSpeech({ provider, proto: 'rest', buildUrl, getToken, voice, rate: 1.2, model }));
    if (supportsWs) {
      setWsTts(createTextToSpeech({ provider, proto: 'ws', buildUrl, getToken, voice, rate: 1.2, model }));
    }
  }, [provider, voice]);
  const toggle = (tts: TextToSpeechBase) => {
    if (!playing) {
      setPlaying(true);
      setLatency(0);
      tts!.onPlaying = () => setLatency(tts!.latency);
      tts!.onComplete = () => setPlaying(false);
      tts!.onError = (_error: Error) => setPlaying(false);
      tts!.play(text);
      tts!.flush();
    } else {
      setPlaying(false);
      tts!.stop();
    }
  };
  const toggleRest = () => toggle(restTts!);
  const toggleWs = () => toggle(wsTts!);

  const caption = playing ? 'Stop' : 'Play';
  const latencyText = latency ? `${latency} ms` : playing ? 'Generating...' : '';
  const wsButton = supportsWs ? <Button onClick={toggleWs}>{`${caption} WS`}</Button> : null;
  return (
    <div className="mt-2">
      <p className="text-xl font-bold mt-2 ml-2">
        <a className="hover:underline" href={link}>
          {display}
        </a>
      </p>
      <div className="text-sm ml-2">
        <span className="font-bold">Cost: </span>
        <a className="hover:underline" href={`${link}/pricing`}>
          ${costPerKChar.toFixed(3)}/thousand chars
        </a>
      </div>
      <div className="text-sm ml-2">
        <span className="font-bold">Voice: </span>
        <input
          type="text"
          name={`${provider}Voice`}
          list="voiceName"
          className="text-sm h-5 bg-fixie-dust p-1 w-48"
          value={voice}
          onChange={(e) => setVoice(e.currentTarget.value)}
        />
      </div>
      <div className="text-sm ml-2 mb-2">
        <span className="font-bold">Latency: </span>
        {latencyText}
      </div>
      <Button onClick={toggleRest}>{caption}</Button>
      {wsButton}
    </div>
  );
};
const countWords = (text: string) => text.split(/\s+/).length;

const PageComponent: React.FC = () => {
  const searchParams = useSearchParams();
  const textParam = searchParams.get('text');
  const [text, setText] = useState(DEFAULT_TEXT);
  if (textParam && !text) {
    setText(textParam);
  }
  return (
    <>
      <p className="font-sm ml-2 mb-2">
        This demo exercises several real-time TTS (text-to-speech) implementations. Clicking a Play button will convert
        the text below to speech using the selected implementation. Some implementations also support WebSockets,
        indicated by the presence of a Play WS button.
      </p>
      <textarea
        className="m-2"
        cols={80}
        rows={6}
        id="input"
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
      ></textarea>
      <p className="ml-2 mb-2 text-sm">{countWords(text)} words</p>
      <div className="grid grid-cols-1 md:grid-cols-2 w-full">
        <Tts
          display="ElevenLabs v1"
          provider="eleven"
          supportsWs
          link="https://elevenlabs.io"
          costPerKChar={0.18}
          defaultVoice="21m00Tcm4TlvDq8ikWAM"
          text={text}
        />
        <Tts
          display="ElevenLabs v2"
          provider="eleven"
          supportsWs
          link="https://elevenlabs.io"
          costPerKChar={0.18}
          defaultVoice="21m00Tcm4TlvDq8ikWAM"
          model="eleven_english_v2"
          text={text}
        />
        <Tts
          display="LMNT"
          provider="lmnt"
          supportsWs
          link="https://lmnt.com"
          costPerKChar={0.2}
          defaultVoice="mrnmrz72"
          text={text}
        />
        <Tts
          display="Murf AI"
          provider="murf"
          link="https://murf.ai"
          costPerKChar={1.0}
          defaultVoice="en-US-natalie"
          text={text}
        />
        <Tts
          display="PlayHT"
          provider="playht"
          link="https://play.ht"
          costPerKChar={0.04125}
          defaultVoice="s3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json"
          text={text}
        />
        <Tts
          display="Resemble AI"
          provider="resemble"
          link="https://resemble.ai"
          costPerKChar={0.4}
          defaultVoice="e28236ee"
          text={text}
        />
        <Tts
          display="WellSaid Labs"
          provider="wellsaid"
          link="https://wellsaidlabs.com"
          costPerKChar={1.0}
          defaultVoice="43"
          text={text}
        />
        <Tts
          display="Azure"
          provider="azure"
          link="https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services"
          costPerKChar={0.016}
          defaultVoice="en-US-JennyNeural"
          text={text}
        />
        <Tts
          display="AWS Polly"
          provider="aws"
          link="https://aws.amazon.com/polly"
          costPerKChar={0.016}
          defaultVoice="Joanna"
          text={text}
        />
        <Tts
          display="Google"
          provider="gcp"
          link="https://cloud.google.com/text-to-speech"
          costPerKChar={0.016}
          defaultVoice="en-US-Neural2-C"
          text={text}
        />
      </div>
    </>
  );
};

export default PageComponent;
