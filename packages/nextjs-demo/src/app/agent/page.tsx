'use client';
import React, { useState } from 'react';
import { DeepgramSpeechRecognition, MicManager, Transcript } from 'ai-jsx/lib/asr/asr';
import { AzureTextToSpeech, TextToSpeechBase } from 'ai-jsx/lib/tts/tts';
import '../globals.css';

const pending: { [key: string]: AssistantRequest } = {};
const messages: string[] = [];

const ButtonComponent: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode }> = ({
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

/**
 * Retrieves an ephemeral token from the server for use in a TTS service.
 */
async function GetToken(provider: string) {
  const response = await fetch('/asr/api', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });
  const json = await response.json();
  return json.token;
}

/**
 * Builds a URL for use in a TTS service.
 */
function BuildUrl(provider: string, voice: string, rate: number, text: string) {
  return `/tts/api?provider=${provider}&voice=${voice}&rate=${rate}&text=${text}`;
}

class AssistantRequest {
  public outMessage = '';
  public done = false;
  public onupdate?: (request: AssistantRequest, newText: string) => void;
  public oncomplete?: (request: AssistantRequest) => void;
  constructor(private readonly inMessages: string[], public active: boolean, public tts: TextToSpeechBase) {}

  async start() {
    console.log(`calling LLM for ${this.inMessages[this.inMessages.length - 1]}`);
    const startTime = performance.now();
    const res = await fetch('/agent/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: this.inMessages }),
    });
    console.log(`Got LLM response, latency=${(performance.now() - startTime).toFixed(0)}`);
    const reader = res.body!.getReader();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        this.done = true;
        this.oncomplete?.(this);
        break;
      }
      if (!this.outMessage) {
        console.log(`first token: ${this.outMessage} latency=${(performance.now() - startTime).toFixed(0)}`);
      }
      const newText = new TextDecoder().decode(value);
      this.outMessage += newText;
      this.onupdate?.(this, newText);
    }
  }
}

const PageComponent: React.FC = () => {
  const [manager, setManager] = useState<MicManager | null>(null);
  const [asr, setAsr] = useState<DeepgramSpeechRecognition | null>(null);
  const [tts, setTts] = useState<AzureTextToSpeech | null>(null);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const active = () => Boolean(manager);
  const handleRequestUpdate = (request: AssistantRequest, newText: string) => {
    console.log(`request update, active=${request.active}`);
    if (request.active) {
      setOutput(request.outMessage);
      request.tts.play(newText);
    }
  };
  const handleRequestDone = (request: AssistantRequest) => {
    console.log(`request done, active=${request.active}`);
    if (request.active) {
      messages.push(request.outMessage);
      setInput('');
    } //++++ handle weird timing case where this happens before active
  };
  const handleInputUpdate = (text: string, final: boolean, tts: TextToSpeechBase) => {
    const newMessages = [...messages, text];
    const hit = text in pending;
    console.log(`${final ? 'final' : 'partial'}: ${text} ${hit ? 'HIT' : 'MISS'}`);
    if (!hit) {
      const request = new AssistantRequest(newMessages, final, tts);
      request.onupdate = handleRequestUpdate;
      request.oncomplete = handleRequestDone;
      pending[text] = request;
      request.start();
    } else {
      const request = pending[text];
      request.active = true;
      setOutput(request.outMessage);
      tts.play(request.outMessage);
    }
  };
  const handleStop = () => {
    if (!active()) {
      return;
    }
    console.log('stopping');
    tts?.stop();
    asr?.close();
    manager?.stop();
    setTts(null);
    setAsr(null);
    setManager(null);
  };
  const handleStart = async () => {
    const _manager = new MicManager();
    const _asr = new DeepgramSpeechRecognition(_manager, GetToken);
    // const _tts = new ElevenLabsTextToSpeech(ELEVEN_VOICE, 1.2);
    const _tts = new AzureTextToSpeech(BuildUrl, AzureTextToSpeech.DEFAULT_VOICE, 1.4);
    setManager(_manager);
    setAsr(_asr);
    setTts(_tts);
    console.log('starting');
    await _manager.startMic(100, () => handleStop());
    _asr.addEventListener('transcript', (event: CustomEventInit<Transcript>) => {
      const obj = event.detail!;
      handleInputUpdate(obj.text, obj.final, _tts);
      setInput(obj.text);
    });
    console.log('starting ASR');
    _asr.start();
    handleInputUpdate('Hi!', true, _tts);
  };

  return (
    <>
      <div className="w-full">
        <p className="font-sm ml-2 mb-2">
          This demo allows you to chat (via voice) with a knowledgeable fox 🦊. Click Start to begin.
        </p>
        <div>
          <textarea className="m-2 w-full" readOnly id="output" rows={10} cols={80} value={output}></textarea>
        </div>
        <div>
          <input className="m-2 w-full text-lg" id="input" readOnly value={input}></input>
        </div>
        <div className="m-2 w-full flex justify-center">
          <ButtonComponent disabled={active()} onClick={handleStart}>
            Start Chatting
          </ButtonComponent>
          <ButtonComponent disabled={!active()} onClick={handleStop}>
            Stop Chatting
          </ButtonComponent>
        </div>
      </div>
    </>
  );
};

export default PageComponent;
