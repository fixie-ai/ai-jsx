'use client';
import {
  TextToSpeechBase,
  AzureTextToSpeech,
  ElevenLabsTextToSpeech,
} from 'ai-jsx/lib/tts/tts';
import React, { useState, useEffect } from 'react';
import '../globals.css';

const DEFAULT_TEXT = `His palms are sweaty, knees weak, arms are heavy
There's vomit on his sweater already, mom's spaghetti
He's nervous, but on the surface he looks calm and ready
To drop bombs, but he keeps on forgetting
What he wrote down, the whole crowd goes so loud
He opens his mouth, but the words won't come out`;

const ButtonComponent: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className={
      'ml-2 rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon'
    }
  >
    {children}
  </button>
);

type TtsComponentProps = {
  display: string;
  provider: string;
  text: string;
};

const buildUrl = (provider: string, voice: string, rate: number, text: string) =>
  `/tts/api?provider=${provider}&voice=${voice}&rate=${rate}&text=${text}`;
const getToken = async (provider: string) => {
  const response = await fetch('/tts/api', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });
  const json = await response.json();
  return json.token;
};

const TtsComponent: React.FC<TtsComponentProps> = ({ display, provider, text }) => {
  const [playing, setPlaying] = useState(false);
  const [latency, setLatency] = useState(0);
  const [tts, setTts] = useState<TextToSpeechBase | null>();
  useEffect(() => {
    if (provider === 'eleven') {
      setTts(new ElevenLabsTextToSpeech(getToken));
    } else if (provider === 'azure') {
      setTts(new AzureTextToSpeech(buildUrl));
    }
  }, [provider]);
  const toggle = async () => {
    if (!playing) {
      setPlaying(true);
      setLatency(0);
      tts!.onPlaying = () => setLatency(tts!.latency);
      tts!.onEnded = () => setPlaying(false);
      tts!.play(text);
      tts!.flush();
    } else {
      console.log('stopping');
      setPlaying(false);
      tts!.stop();
    }
  };
  const caption = playing ? 'Stop' : `Play ${display}`;
  const latencyText = playing ? (latency ? `${latency} ms` : 'Generating...') : '';
  return (
    <div className="mt-2">
      <ButtonComponent onClick={toggle}>{caption}</ButtonComponent>
      <span className="m-2">{latencyText}</span>
    </div>
  );
};
const countWords = (text: string) => text.split(/\s+/).length;

const PageComponent: React.FC = () => {
  const [text, setText] = useState(DEFAULT_TEXT);
  return (
    <>
      <p className="font-sm ml-2 mb-2">
        This demo exercises several real-time TTS (text-to-speech) implementations. Clicking a button will convert the
        text below to speech and play it out using the specified implementation.
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
      <TtsComponent display="ElevenLabs" provider="eleven" text={text}></TtsComponent>
      <TtsComponent display="Azure" provider="azure" text={text}></TtsComponent>
    </>
  );
};

export default PageComponent;
