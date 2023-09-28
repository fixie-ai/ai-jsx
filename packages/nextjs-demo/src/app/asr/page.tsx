'use client';
import '../globals.css';
import React, { useState, useEffect, useRef } from 'react';
import { MicManager, createSpeechRecognition, SpeechRecognitionBase, Transcript } from 'ai-jsx/lib/asr/asr';
import { wordErrorRate } from 'word-error-rate';
import _ from 'lodash';

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
async function getToken(provider: string) {
  const response = await fetch('/asr/api', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });
  const json = await response.json();
  return json.token;
}

/**
 * Removes caps, punctuation, and extra whitespace from a string.
 */
function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]|_/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const TranscriptRenderer: React.FC<{ value: Transcript[] }> = ({ value }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current!.scrollTop = ref.current!.scrollHeight;
  });
  return (
    <div className="mt-4 mr-4 mb-4 w-96 h-36 p-4 bg-fixie-dust overflow-y-scroll" ref={ref}>
      {value.map((transcript, index) => (
        <p key={index} className={transcript.final ? 'text-black' : 'text-black/40'}>
          {transcript.text}
        </p>
      ))}
    </div>
  );
};

interface AsrProps {
  name: string;
  link: string;
  id: string;
  model?: string;
  language?: string;
  costPerMinute: number;
  manager: MicManager | null;
  transcript?: string;
}

const Asr: React.FC<AsrProps> = ({ name, link, id, costPerMinute, manager, transcript }) => {
  const [output, setOutput] = useState<Transcript[]>([]);
  const outputRef = useRef(output);
  const [partialLatency, setPartialLatency] = useState<number[]>([]);
  const [finalLatency, setFinalLatency] = useState<number[]>([]);
  const [recognizer, setRecognizer] = useState<SpeechRecognitionBase | null>(null);
  const justFinals = (transcripts: Transcript[]) => transcripts.filter((transcript) => transcript.final);
  const computeCostColor = (cost: number) => {
    if (cost < 0.01) {
      return 'text-green-700';
    }
    if (cost < 0.02) {
      return 'text-yellow-700';
    }
    return 'text-red-700';
  };
  const computeLatency = (values: number[]) => _.mean(values);
  const computeWer = (transcripts: Transcript[], refText?: string) => {
    if (!transcripts.length || !refText) {
      return 0;
    }
    const numLines = justFinals(transcripts).length;
    const refClean = normalizeText(refText.split('\n').slice(0, numLines).join(' '));
    const inClean = normalizeText(
      justFinals(transcripts)
        .map((transcript) => transcript.text)
        .join(' ')
    );
    return wordErrorRate(refClean, inClean);
  };
  const start = () => {
    const recognizer = createSpeechRecognition({ provider: id, manager: manager!, getToken });
    setRecognizer(recognizer);
    setOutput([]);
    setPartialLatency([]);
    setFinalLatency([]);
    recognizer.addEventListener('transcript', (event: CustomEventInit<Transcript>) => {
      const transcript = event.detail!;
      console.debug(
        `[${id}] ${transcript.timestamp.toFixed(0)} (${transcript.reportedLatency.toFixed(0)}) ${transcript.text} ${
          transcript.final ? 'FINAL' : ''
        }`
      );

      // Determine if there's an earlier partial transcript that matches this one.
      // If so, we'll use that to compute the partial latency.
      // We'll also skip any duplicate partial transcripts.
      let partialLatency = transcript.observedLatency;
      const currOutput = outputRef.current;
      if (currOutput.length > 0) {
        const lastTranscript = currOutput[currOutput.length - 1];
        if (!lastTranscript.final) {
          if (normalizeText(lastTranscript.text) == normalizeText(transcript.text)) {
            console.debug(`[${id}] Duplicate transcript "${transcript.text}"`);
            if (!transcript.final) {
              return;
            }
            partialLatency = transcript.observedLatency - (transcript.timestamp - lastTranscript.timestamp);
          }
        }
      }

      // Update our list of transcripts and latency counters.
      // The final latency is just the transcript timestamp minus the VAD timestamp.
      // The partial latency takes into account any matching partials, or the final latency if there are no matches.
      setOutput((prevOutput) => {
        outputRef.current = [...prevOutput.slice(0, justFinals(prevOutput).length), transcript];
        return outputRef.current;
      });
      if (transcript.final && transcript.observedLatency) {
        setFinalLatency((prev) => [...prev, transcript.observedLatency!]);
        setPartialLatency((prev) => [...prev, partialLatency]);
        console.log(`[${id}] latency=${transcript.observedLatency.toFixed(0)}, partial=${partialLatency.toFixed(0)}`);
      }
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
        <a className="hover:underline" href={link}>
          {name}
        </a>
      </p>
      <div className="text-sm">
        <span className="font-bold">Cost: </span>
        <a className={`hover:underline ${computeCostColor(costPerMinute)}`} href={`${link}/pricing`}>
          ${costPerMinute}/min
        </a>
      </div>
      <div className="text-sm">
        <span className="font-bold">Partial Latency: </span>
        {computeLatency(partialLatency).toFixed(0)} ms
      </div>
      <div className="text-sm">
        <span className="font-bold">Final Latency: </span>
        {computeLatency(finalLatency).toFixed(0)} ms
      </div>
      <div className="text-sm">
        <span className="font-bold">WER: </span>
        {computeWer(output, transcript).toFixed(3)}
      </div>
      <TranscriptRenderer value={output} />
    </div>
  );
};

const Button: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode }> = ({
  onClick,
  disabled,
  children,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`ml-2 rounded-md ${
      disabled ? 'bg-gray-300' : 'bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon'
    } px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon`}
  >
    {children}
  </button>
);

const PageComponent: React.FC = () => {
  const [manager, setManager] = useState<MicManager | null>(null);
  const [transcript, setTranscript] = useState('');
  const handleStartFile = async () => {
    setTranscript(HARVARD_SENTENCES_01_TRANSCRIPT);
    const manager = new MicManager();
    await manager.startFile('/audio/harvard01.m4a', 100, () => setManager(null));
    setManager(manager);
  };
  const handleStartMic = async () => {
    setTranscript('');
    const manager = new MicManager();
    await manager.startMic(100, () => setManager(null));
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
        text recording using <b>Start File</b>, or you can use <b>Start Mic</b> to try with your own voice.
      </p>
      <p className="font-sm ml-2 mb-2">
        Latency is computed for each partial and final transcript, and the average value is displayed. When using a
        file, Word Error Rate (WER) is computed against the ground truth transcript, ignoring punctuation.
      </p>
      <div className="font-bold mt-3 mb-3">
        <Button disabled={Boolean(manager)} onClick={handleStartFile}>
          Start File
        </Button>
        <Button disabled={Boolean(manager)} onClick={handleStartMic}>
          Start Mic
        </Button>
        <Button disabled={!manager} onClick={handleStop}>
          Stop
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <Asr
          name="Deepgram"
          link="https://deepgram.com"
          id="deepgram"
          costPerMinute={0.0059}
          manager={manager}
          transcript={transcript}
        />
        <Asr
          name="AssemblyAI"
          link="https://assemblyai.com"
          id="aai"
          costPerMinute={0.015}
          manager={manager}
          transcript={transcript}
        />
        <Asr
          name="Speechmatics"
          link="https://speechmatics.com"
          id="speechmatics"
          costPerMinute={0.0173}
          manager={manager}
          transcript={transcript}
        />
        <Asr
          name="Rev AI"
          link="https://rev.ai"
          id="revai"
          costPerMinute={0.02}
          manager={manager}
          transcript={transcript}
        />
        <Asr
          name="Soniox"
          link="https://soniox.com"
          id="soniox"
          costPerMinute={0.0067}
          manager={manager}
          transcript={transcript}
        />
        <Asr
          name="Gladia"
          link="https://gladia.io"
          id="gladia"
          costPerMinute={0.0126}
          manager={manager}
          transcript={transcript}
        />
      </div>
    </>
  );
};

export default PageComponent;
