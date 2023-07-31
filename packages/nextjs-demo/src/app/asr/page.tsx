'use client';
import '../globals.css';
import React, { useState, useEffect, useRef } from 'react';
import { MicManager, createSpeechRecognition, SpeechRecognitionBase, Transcript } from 'ai-jsx/lib/asr/asr';
import { wordErrorRate } from 'word-error-rate';

const HARVARD_SENTENCES_01_TRANSCRIPT = `Harvard list number one.
     The birch canoe slid on the smooth planks.
     Glue the sheet to the dark blue background.
     It's easy to tell the depth of a well.
     These days, a chicken leg is a rare dish.
     Rice is often served in round bowls.
     The juice of lemons makes fine punch.
     The box was thrown beside the parked truck.
     The hogs were fed chopped corn and garbage.
     Four hours of steady work faced us.     
     A large size in stockings is hard to sell.`;

/**
 * Retrieves an ephemeral token from the server for the given recognition service.
 */
async function GetToken(provider: string) {
  const response = await fetch('/asr/api', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });
  const json = await response.json();
  return json.token;
}

interface AsrComponentProps {
  name: string;
  link: string;
  id: string;
  model?: string;
  language?: string;
  costPerMinute: number;
  manager: MicManager | null;
}

const AsrComponent: React.FC<AsrComponentProps> = ({ name, link, id, costPerMinute, manager }) => {
  const [count, setCount] = useState(0);
  const [wer, setWer] = useState(0.0);
  const [latency, setLatency] = useState(0);
  const [recognizer, setRecognizer] = useState<SpeechRecognitionBase | null>(null);
  const textarea = useRef(null);
  const computeWer = (inText: string, refText: string) => {
    const numLines = inText.split('\n').length - 1;
    const refClean = refText
      .split('\n')
      .slice(0, numLines)
      .join(' ')
      .replace(/[^\w\s]|_/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const inClean = inText
      .replace(/[^\w\s]|_/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return wordErrorRate(refClean, inClean);
  };
  const start = () => {
    const recognizer = createSpeechRecognition(id, manager!, GetToken);
    const element = textarea.current! as HTMLTextAreaElement;
    setRecognizer(recognizer);
    element.value = '';
    recognizer.addEventListener('transcript', (event: CustomEventInit<Transcript>) => {
      const currData = element.value;
      const lastNewlineIndex = currData.lastIndexOf('\n');
      const oldData = lastNewlineIndex != -1 ? currData.slice(0, lastNewlineIndex + 1) : '';
      let newData = oldData + event.detail!.text;
      if (event.detail!.final) {
        newData += '\n';
        setLatency((latency * count + event.detail!.latency!) / (count + 1));
        setCount(count + 1);
        const wer = computeWer(newData, HARVARD_SENTENCES_01_TRANSCRIPT);
        setWer(wer);
      }
      element.value = newData;
      element.scrollTop = element.scrollHeight;
    });
    recognizer.start();
  };
  const stop = () => {
    if (recognizer) {
      recognizer.close();
      setRecognizer(null);
    }
  };
  useEffect(() => {
    if (manager) {
      start();
    } else {
      stop();
    }
  }, [manager]);
  return (
    <div className="ml-2">
      <p className="text-xl font-bold mt-2">
        <a href={link}>{name}</a>
      </p>
      <div className="text-sm">
        <span className="font-bold">Cost: </span>
        <a href={`${link}/pricing`}>${costPerMinute}/min</a>
      </div>
      <div className="text-sm">
        <span className="font-bold">Latency: </span>
        {latency.toFixed(0)} ms
      </div>
      <div className="text-sm">
        <span className="font-bold">WER: </span>
        {wer.toFixed(3)}
      </div>
      <textarea cols={80} rows={5} ref={textarea}></textarea>
    </div>
  );
};

const PageComponent: React.FC = () => {
  const [manager, setManager] = useState<MicManager | null>(null);
  const handleStartFile = async () => {
    const manager = new MicManager();
    await manager.startFile('/audio/harvard01.m4a', 100);
    setManager(manager);
  };
  const handleStartMic = async () => {
    const manager = new MicManager();
    await manager.startMic(100);
    setManager(manager);
  };
  const handleStop = () => {
    manager?.stop();
    setManager(null);
  };
  return (
    <>
      <p className="font-sm ml-2 mb-2">
        This demo exercises several real-time ASR (speech-to-text) implementations. You can see how they do on a stock
        text recording using Start File, or you can use Start Mic to try with your own voice.
      </p>
      <div className="font-bold">
        <button onClick={handleStartFile}>Start File</button>
        <button onClick={handleStartMic}>Start Mic</button>
        <button onClick={handleStop}>Stop</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <AsrComponent
          name="Deepgram"
          link="https://deegram.com"
          id="deepgram"
          costPerMinute={0.0059}
          manager={manager}
        />
        <AsrComponent
          name="AssemblyAI"
          link="https://assemblyai.com"
          id="aai"
          costPerMinute={0.015}
          manager={manager}
        />
        <AsrComponent
          name="Speechmatics"
          link="https://speechmatics.com"
          id="speechmatics"
          costPerMinute={0.0173}
          manager={manager}
        />
        <AsrComponent name="Rev AI" link="https://rev.ai" id="revai" costPerMinute={0.02} manager={manager} />
        <AsrComponent name="Soniox" link="https://soniox.com" id="soniox" costPerMinute={0.0067} manager={manager} />
        <AsrComponent name="Gladia" link="https://gladia.io" id="gladia" costPerMinute={0.0126} manager={manager} />
      </div>
    </>
  );
};

export default PageComponent;
