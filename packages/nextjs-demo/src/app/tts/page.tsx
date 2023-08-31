'use client';
import { TextToSpeech } from './tts';
import '../globals.css';
import React, { useState, useEffect } from 'react';

const DEFAULT_TEXT = `His palms are sweaty, knees weak, arms are heavy
There's vomit on his sweater already, mom's spaghetti
He's nervous, but on the surface he looks calm and ready
To drop bombs, but he keeps on forgetting
What he wrote down, the whole crowd goes so loud
He opens his mouth, but the words won't come out`;

const ELEVEN_VOICE = '21m00Tcm4TlvDq8ikWAM';
const AZURE_VOICE = 'en-US-JennyNeural';

type TtsComponentProps = {
  display: string;
  provider: string;
  voice: string;
  text: string;
};

const TtsComponent: React.FC<TtsComponentProps> = ({
  display,
  provider,
  voice,
  text
}) => {
  const [latency, setLatency] = useState(0);
  const tts = new TextToSpeech(provider, voice);
  const play = async () => {
    await tts.play(text);
    setLatency(tts.latency);
  };
  //useEffect(() => {
  //  latencySpan.innerText = `${latency} ms`;
  //}, [latency, provider]);
  return (
    <div>
      <button onClick={play}>
        <p className="font-bold">{display}</p>
      </button>
      <span>{latency} ms</span>
    </div>
  );
};
//<TtsComponent provider="aws" voice={AZURE_VOICE} />
const PageComponent: React.FC = () => {
  const [text, setText] = useState(DEFAULT_TEXT);
  return (
    <>
      <p className="font-sm ml-2 mb-2">
        This demo exercises several real-time TTS (text-to-speech)
        implementations. Clicking a button will render the text below using the
        specified implementation.
      </p>
      <textarea
        cols={80}
        rows={6}
        id="input"
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
      ></textarea>
      <TtsComponent
        display="ElevenLabs"
        provider="eleven"
        voice={ELEVEN_VOICE}
        text={text}
      ></TtsComponent>
      <TtsComponent
        display="Azure"
        provider="azure"
        voice={AZURE_VOICE}
        text={text}
      ></TtsComponent>
    </>
  );
};

export default PageComponent;
