'use client';
import React, { useState } from 'react';
import { createSpeechRecognition, SpeechRecognitionBase, MicManager, Transcript } from 'ai-jsx/lib/asr/asr';
import { createTextToSpeech, TextToSpeechBase } from 'ai-jsx/lib/tts/tts';
import { useSearchParams } from 'next/navigation';
import '../globals.css';

// pending/messages cleanup
// tts bargein?
// caching or other initial startup opt?
// cleanup of other grody stuff (pending etc)
// flashing input box
// spacebar to start

const DEFAULT_ASR_PROVIDER = 'deepgram';
const DEFAULT_TTS_PROVIDER = 'azure';

class ClientMessage {
  constructor(public readonly role: string, public readonly content: string) {}
}

const pending: { [key: string]: AssistantRequest } = {};
const messages: ClientMessage[] = [];

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
 * Retrieves an ephemeral token from the server for use in an ASR service.
 */
async function getAsrToken(provider: string) {
  const response = await fetch('/asr/api', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });
  const json = await response.json();
  return json.token;
}

/**
 * Retrieves an ephemeral token from the server for use in an ASR service.
 */
async function getTtsToken(provider: string) {
  const response = await fetch('/tts/api', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });
  const json = await response.json();
  return json.token;
}

/**
 * Builds a URL for use in a TTS service.
 */
function buildTtsUrl(provider: string, voice: string, rate: number, text: string) {
  return `/tts/api?provider=${provider}&voice=${voice}&rate=${rate}&text=${text}`;
}

class AssistantRequest {
  public outMessage = '';
  public done = false;
  public onUpdate?: (request: AssistantRequest, newText: string) => void;
  public onComplete?: (request: AssistantRequest) => void;
  constructor(private readonly inMessages: ClientMessage[], public active: boolean, public tts: TextToSpeechBase) {}
  async start() {
    console.log(`calling LLM for ${this.inMessages[this.inMessages.length - 1].content}`);
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
        this.onComplete?.(this);
        break;
      }
      const newText = new TextDecoder().decode(value);
      this.outMessage += newText;
      this.onUpdate?.(this, newText);
    }
  }
}

const PageComponent: React.FC = () => {
  const searchParams = useSearchParams();
  const [manager, setManager] = useState<MicManager | null>(null);
  const [asr, setAsr] = useState<SpeechRecognitionBase | null>(null);
  const [tts, setTts] = useState<TextToSpeechBase | null>(null);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const active = () => Boolean(manager);
  const handleRequestUpdate = (request: AssistantRequest, newText: string) => {
    if (request.active) {
      setOutput(request.outMessage);
      request.tts.play(newText);
    }
  };
  const finishRequest = (request: AssistantRequest) => {
    request.tts.flush();
    const assistantMessage = new ClientMessage('assistant', request.outMessage);
    messages.push(assistantMessage);
    // messages.forEach(message => console.log(`role=${message.role}, content=${message.content}`));
    setInput('');
    for (const x in pending) {
      delete pending[x];
    }
  };
  const handleRequestDone = (request: AssistantRequest) => {
    console.log(`request done, active=${request.active}`);
    if (request.active) {
      finishRequest(request);
    }
  };
  const handleInputUpdate = (text: string, final: boolean, tts: TextToSpeechBase) => {
    // If the input text has been finalized, add it to the message history.
    const userMessage = new ClientMessage('user', text);
    const newMessages = [...messages, userMessage];
    if (final) {
      messages.push(userMessage);
    }

    // If it doesn't match an existing request, kick off a new one.
    // If it matches an existing request and the text is finalized, speculative
    // execution worked! Snap forward to the current state of that request.
    const hit = text in pending;
    console.log(`${final ? 'final' : 'partial'}: ${text} ${hit ? 'HIT' : 'MISS'}`);
    if (!hit) {
      const request = new AssistantRequest(newMessages, final, tts);
      request.onUpdate = handleRequestUpdate;
      request.onComplete = handleRequestDone;
      pending[text] = request;
      request.start();
    } else if (final) {
      const request = pending[text];
      request.active = true;
      setOutput(request.outMessage);
      tts.play(request.outMessage);
      if (request.done) {
        finishRequest(request);
      }
    }
  };
  const handleStop = () => {
    if (!active()) {
      return;
    }
    console.log('stopping');
    setInput('');
    tts?.close();
    asr?.close();
    manager?.stop();
    setTts(null);
    setAsr(null);
    setManager(null);
    messages.length = 0;
    for (const x in pending) {
      delete pending[x];
    }
  };
  const handleStart = async () => {
    const _manager = new MicManager();
    const asrProvider = searchParams.get('asr') || DEFAULT_ASR_PROVIDER;
    const _asr = createSpeechRecognition(asrProvider, _manager, getAsrToken);
    // Note that we pass around _tts because of the annoying fact that useState
    // can't update the tts value once it's captured in closures.
    const ttsProvider = searchParams.get('tts') || DEFAULT_TTS_PROVIDER;
    const _tts = createTextToSpeech({ provider: ttsProvider, getToken: getTtsToken, buildUrl: buildTtsUrl, rate: 1.2 });
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
          This demo allows you to chat (via voice) with a drive-thru agent at a Krispy Kreme. Click Start to begin.
        </p>
        <div className="grid grid-cols-2">
          <div className="p-4">
            <p className="text-lg font-bold">🍩 DONUTS</p>
            <ul className="text-sm">
              <li>PUMPKIN SPICE ORIGINAL GLAZED® DOUGHNUT $1.29</li>
              <ul>
                <li>PUMPKIN SPICE CAKE DOUGHNUT $1.29</li>
                <li>PUMPKIN SPICE CHEESECAKE SWIRL DOUGHNUT $1.29</li>
                <li>PUMPKIN SPICE MAPLE PECAN DOUGHNUT $1.29</li>
                <li>ORIGINAL GLAZED® DOUGHNUT $0.99</li>
                <li>CHOCOLATE ICED GLAZED DOUGHNUT $1.09</li>
                <li>CHOCOLATE ICED GLAZED DOUGHNUT WITH SPRINKLES $1.09</li>
                <li>GLAZED RASPBERRY FILLED DOUGHNUT $1.09</li>
                <li>GLAZED BLUEBERRY CAKE DOUGHNUT $1.09</li>
                <li>STRAWBERRY ICED DOUGHNUT WITH SPRINKLES $1.09</li>
                <li>GLAZED LEMON FILLED DOUGHNUT $1.09</li>
                <li>CHOCOLATE ICED CUSTARD FILLED DOUGHNUT $1.09</li>
                <li>CHOCOLATE ICED DOUGHNUT WITH KREME™ FILLING $1.09</li>
                <li>CAKE BATTER DOUGHNUT $1.09</li>
                <li>ORIGINAL GLAZED® DOUGHNUT HOLES $3.99</li>
              </ul>
            </ul>
          </div>
          <div className="p-4">
            <p className="text-lg font-bold">☕️ COFFEE & DRINKS</p>
            <ul className="text-sm">
              <li>PUMPKIN SPICE COFFEE $2.59</li>
              <li>PUMPKIN SPICE LATTE $4.59</li>
              <li>CLASSIC BREWED COFFEE $1.79</li>
              <li>CLASSIC DECAF BREWED COFFEE $1.79</li>
              <li>LATTE $3.49</li>
              <li>VANILLA SPECIALTY LATTE $3.49</li>
              <li>ORIGINAL GLAZED® LATTE $3.49</li>
              <li>CARAMEL SPECIALTY LATTE $3.49</li>
              <li>CARAMEL MOCHA SPECIALTY LATTE $3.49</li>
              <li>MOCHA SPECIALTY LATTE $3.49</li>
            </ul>
          </div>
        </div>
        <div>
          <div className="m-2 w-full h-32 border-2" id="output">{output}</div>
        </div>
        <div>
          <div className="m-2 w-full text-lg h-12 border-2" id="input">{input}</div>
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
