'use client';
import { TextToSpeechBase, createTextToSpeech } from 'ai-jsx/lib/tts/tts';
import React, { useState, useEffect } from 'react';
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

type TtsProps = {
  display: string;
  provider: string;
  link: string;
  costPerMChar: number;
  defaultVoice: string;
  text: string;
};

const buildUrl = (provider: string, voice: string, rate: number, text: string) => {
  const params = new URLSearchParams({
    provider,
    voice,
    rate: rate.toString(),
    text,
  });
  return `/tts/api?${params}`;
};

const getToken = async (provider: string) => {
  const response = await fetch('/tts/api', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });
  const json = await response.json();
  return json.token;
};

const Tts: React.FC<TtsProps> = ({ display, provider, link, costPerMChar, defaultVoice, text }) => {
  const [voice, setVoice] = useState(defaultVoice);
  const [playing, setPlaying] = useState(false);
  const [latency, setLatency] = useState(0);
  const [tts, setTts] = useState<TextToSpeechBase | null>();
  useEffect(() => {
    setTts(createTextToSpeech({ provider, buildUrl, getToken, voice, rate: 1.2 }));
  }, [provider, voice]);
  const toggle = () => {
    if (!playing) {
      setPlaying(true);
      setLatency(0);
      tts!.onPlaying = () => setLatency(tts!.latency);
      tts!.onComplete = () => setPlaying(false);
      tts!.play(text);
      tts!.flush();
    } else {
      setPlaying(false);
      tts!.stop();
    }
  };

  const caption = playing ? 'Stop' : 'Play';
  const latencyText = playing ? (latency ? `${latency} ms` : 'Generating...') : '';
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
          ${costPerMChar}/million chars
        </a>
      </div>
      <div className="text-sm ml-2 mb-2">
        <span className="font-bold">Voice: </span>
        <input
          type="text"
          list="voiceName"
          className="text-sm h-5 bg-fixie-dust p-1 w-48"
          value={voice}
          onChange={(e) => setVoice(e.currentTarget.value)}
        />
      </div>
      <Button onClick={toggle}>{caption}</Button>
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
      <div className="grid grid-cols-1 md:grid-cols-2 w-full">
        <Tts
          display="ElevenLabs"
          provider="eleven"
          link="https://elevenlabs.io"
          costPerMChar={180}
          defaultVoice="21m00Tcm4TlvDq8ikWAM"
          text={text}
        ></Tts>
        <Tts
          display="WellSaid Labs"
          provider="wellsaid"
          link="https://wellsaidlabs.com"
          costPerMChar={999}
          defaultVoice="43"
          text={text}
        ></Tts>
        <Tts
          display="Azure"
          provider="azure"
          link="https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services"
          costPerMChar={16}
          defaultVoice="en-US-JennyNeural"
          text={text}
        ></Tts>
        <Tts
          display="AWS Polly"
          provider="aws"
          link="https://aws.amazon.com/polly"
          costPerMChar={16}
          defaultVoice="Joanna"
          text={text}
        ></Tts>
        <Tts
          display="Google"
          provider="gcp"
          link="https://cloud.google.com/text-to-speech"
          costPerMChar={16}
          defaultVoice="en-US-Wavenet-D"
          text={text}
        ></Tts>
      </div>
    </>
  );
};

export default PageComponent;
