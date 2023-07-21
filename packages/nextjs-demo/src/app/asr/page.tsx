'use client';
import '../globals.css';
import React, { useState, useEffect } from 'react';
import {
  MicManager,
  SpeechRecognitionFactory,
  SpeechRecognitionBase,
} from '@ai-jsx/lib/asr/asr';
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

interface AsrComponentProps {
  name: string;
  id: string;
  manager: MicManager | null;
}

const AsrComponent: React.FC<AsrComponentProps> = ({ name, id, manager }) => {
  const [wer, setWer] = useState<number | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [recognizer, setRecognizer] = useState<SpeechRecognitionBase>(null);
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
    const recognizer = SpeechRecognitionFactory.create(id, manager);
    setRecognizer(recognizer);
    const el = document.getElementById(id) as HTMLTextAreaElement;
    el.value = '';
    recognizer.addEventListener('transcript', (event: CustomEvent) => {
      const lastNewlineIndex = el.value.lastIndexOf('\n');
      const oldData =
        lastNewlineIndex != -1 ? el.value.slice(0, lastNewlineIndex + 1) : '';
      el.value = oldData + event.detail.transcript;
      if (event.detail.final) {
        el.value += '\n';
        setLatency(event.detail.latency);
        const wer = computeWer(el.value, HARVARD_SENTENCES_01_TRANSCRIPT);
        setWer(wer);
      }
      el.scrollTop = el.scrollHeight;
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
      <p className="text-xl font-bold mt-2">{name}</p>
      <div className="text-sm">
        Latency: {latency ? latency.toFixed(0) : ''} ms
      </div>
      <div className="text-sm">
        Word Error Rate: {wer !== null ? wer.toFixed(3) : ''}
      </div>
      <textarea cols={80} rows={5} id={id}></textarea>
    </div>
  );
};

const PageComponent: React.FC = () => {
  const [manager, setManager] = useState<MicManager>(null);
  const handleStartFile = () => {
    const manager = new MicManager();
    manager.startFile('/audio/harvard01.m4a', 100);
    setManager(manager);
  };
  const handleStartMic = () => {
    const manager = new MicManager();
    manager.startMic(100);
    setManager(manager);
  };
  const handleStop = () => {
    manager.stop();
    setManager(null);
  };
  return (
    <>
      <p className="font-sm ml-2 mb-2">
        This demo exercises several real-time ASR (speech-to-text)
        implementations. You can see how they do on a stock text recording using
        Start File, or you can use Start Mic to try with your own voice.
      </p>
      <div className="font-bold">
        <button onClick={handleStartFile}>Start File</button>
        <button onClick={handleStartMic}>Start Mic</button>
        <button onClick={handleStop}>Stop</button>
      </div>
      <AsrComponent name="Deepgram" id="deepgram" manager={manager} />
      <AsrComponent name="Soniox" id="soniox" manager={manager} />
      <AsrComponent name="Gladia" id="gladia" manager={manager} />
      <AsrComponent name="AssemblyAI" id="aai" manager={manager} />
    </>
  );
};

export default PageComponent;
