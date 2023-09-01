"use client";
import React from "react";
import "../globals.css";
import { MicManager, SpeechRecognitionFactory } from "../asr/asr";
import { TextToSpeech } from "../tts/tts";

const manager: MicManager = new MicManager();
let asr = null;
const tts = new TextToSpeech("azure", "en-US-JennyNeural", 1.2);
const messages = [];

async function start(timeslice: number) {
  if (!asr) {
    asr = SpeechRecognitionFactory.create("deepgram", manager);
    await manager.startMic(timeslice);
    asr.addEventListener("transcript", (event) => {
      if (event.detail.final) {
        console.log(`input: ${event.detail.transcript}`);
        handleInput(event.detail.transcript);
      }
    });
    console.log("starting ASR");
    asr.start();
    requestOutput();
  }
}

async function handleInput(text: string) {
  messages.push(text);
  requestOutput();
}

async function requestOutput() {
  console.log("calling LLM");
  const startTime = window.performance.now();
  const res = await fetch("/agent/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages: messages }),
  });
  const data = await res.json();
  console.log(
    `output: ${data.text}, latency: ${Math.floor(
      window.performance.now() - startTime,
    )} ms`,
  );
  (document.getElementById("output") as HTMLTextAreaElement).value = data.text;
  messages.push(data.text);
  console.log("calling TTS");
  tts.play(data.text);
}

async function stop() {
  tts.stop();
  if (asr) {
    console.log("stopping ASR");
    await asr.close();
    await manager.stop();
    asr = null;
  }
}

const PageComponent: React.FC = () => {
  const handleStart = () => start(100);
  const handleStop = () => stop();
  return (
    <>
      <p className="font-sm ml-2 mb-2">
        This demo allows you to chat (via voice) with a knowledgeable fox 🦊.
        Click Start to begin.
      </p>
      <div className="font-bold">
        <button onClick={handleStart}>Start</button>
        <button onClick={handleStop}>Stop</button>
      </div>
      <div>
        <textarea id="output" rows={10} cols={80}></textarea>
      </div>
    </>
  );
};

export default PageComponent;
