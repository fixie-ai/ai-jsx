'use client';
import React, { useEffect, useState } from 'react';
import {
  createSpeechRecognition,
  normalizeText,
  SpeechRecognitionBase,
  MicManager,
  Transcript,
} from 'ai-jsx/lib/asr/asr';
import { createTextToSpeech, TextToSpeechBase, TextToSpeechProtocol } from 'ai-jsx/lib/tts/tts';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import '../globals.css';

// 1. VAD triggers silence. (Latency here is frame size + VAD delay)
// 2. ASR sends partial transcript. ASR latency = 2-1.
// 3. ASR sends final transcript. ASR latency = 3-1.
// 4. LLM request is made. This can happen before 3 is complete, in which case the speculative execution savings is 3-2.
// 5. LLM starts streaming tokens. LLM base latency = 5-4.
// 6. LLM sends enough tokens for TTS to start (full sentence, or 50 chars). LLM token latency = 6-5, LLM total latency = 6-4.
// 7. TTS requests chunk of audio.
// 8. TTS chunk is received.
// 9. TTS playout starts (usually just about instantaneous after 8). TTS latency = 9-7.
// Total latency = 9-1 = ASR latency + LLM base latency + LLM token latency TTS latency - speculative execution savings.

// Token per second rules of thumb:
// GPT-4: 12 tps (approx 1s for 50 chars)
// GPT-3.5: 70 tps (approx 0.2s for 50 chars)
// Claude v1: 40 tps (approx 0.4s for 50 chars)
// Claude Instant v1: 70 tps (approx 0.2s for 50 chars)

const DEFAULT_ASR_FRAME_SIZE = 100;
const DEFAULT_ASR_PROVIDER = 'deepgram';
const DEFAULT_TTS_PROVIDER = 'azure';
const DEFAULT_LLM = 'gpt-4';
const ASR_PROVIDERS = ['aai', 'deepgram', 'gladia', 'revai', 'soniox'];
const TTS_PROVIDERS = [
  'aws',
  'azure',
  'eleven',
  'eleven-ws',
  'gcp',
  'lmnt',
  'lmnt-ws',
  'murf',
  'playht',
  'resemble',
  'wellsaid',
];
const LLM_MODELS = ['claude-2', 'claude-instant-1', 'gpt-4', 'gpt-3.5'];

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

/**
 * A single message in the chat history.
 */
class ChatMessage {
  constructor(public readonly role: string, public readonly content: string) {}
}

/**
 * A single request to the LLM, which may be speculative.
 */
class ChatRequest {
  public outMessage = '';
  public done = false;
  public onUpdate?: (request: ChatRequest, newText: string) => void;
  public onComplete?: (request: ChatRequest) => void;
  private startMillis?: number;
  public requestLatency?: number;
  public streamLatency?: number;
  constructor(
    private readonly inMessages: ChatMessage[],
    private readonly model: string,
    private readonly docs: boolean,
    public active: boolean
  ) {}
  async start() {
    console.log(`calling LLM for ${this.inMessages.at(-1)?.content}`);
    this.startMillis = performance.now();
    const res = await fetch('/agent/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: this.inMessages, model: this.model, docs: this.docs }),
    });
    this.requestLatency = performance.now() - this.startMillis;
    console.log(`Got LLM response, latency=${this.requestLatency.toFixed(0)}`);
    const reader = res.body!.getReader();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        this.done = true;
        this.streamLatency = performance.now() - this.startMillis - this.requestLatency;
        this.onComplete?.(this);
        break;
      }
      const newText = new TextDecoder().decode(value);
      this.outMessage += newText;
      this.onUpdate?.(this, newText);
    }
  }
}

class ChatManagerInit {
  constructor(
    public readonly asrProvider: string,
    public readonly ttsProvider: string,
    public readonly model: string,
    public readonly docs: boolean,
    public readonly ttsVoice?: string
  ) {}
}

/**
 * Manages a single chat with a LLM, including speculative execution.
 */
class ChatManager {
  private history: ChatMessage[] = [];
  private pendingRequests: Record<string, ChatRequest> = {};
  private readonly micManager: MicManager;
  private readonly asr: SpeechRecognitionBase;
  private readonly tts: TextToSpeechBase;
  private readonly model: string;
  private readonly docs: boolean;
  onInputChange?: (text: string, final: boolean, latency?: number) => void;
  onOutputChange?: (text: string, final: boolean, latency: number) => void;
  onAudioStart?: (latency: number) => void;
  onAudioEnd?: () => void;
  onError?: () => void;
  constructor({ asrProvider, ttsProvider, ttsVoice, model, docs }: ChatManagerInit) {
    this.micManager = new MicManager();
    this.asr = createSpeechRecognition({ provider: asrProvider, manager: this.micManager, getToken: getAsrToken });
    const ttsSplit = ttsProvider.split('-');
    this.tts = createTextToSpeech({
      provider: ttsSplit[0],
      proto: ttsSplit[1] as TextToSpeechProtocol,
      getToken: getTtsToken,
      buildUrl: buildTtsUrl,
      voice: ttsVoice,
      rate: 1.2,
    });
    this.model = model;
    this.docs = docs;
    this.asr.addEventListener('transcript', (event: CustomEventInit<Transcript>) => {
      const obj = event.detail!;
      this.handleInputUpdate(obj.text, obj.final);
      this.onInputChange?.(obj.text, obj.final, obj.observedLatency);
    });
    this.tts.onPlaying = () => {
      this.onAudioStart?.(this.tts.latency!);
    };
    this.tts.onComplete = () => {
      this.onAudioEnd?.();
    };
  }
  /**
   * Starts the chat.
   */
  async start(initialMessage?: string) {
    await this.micManager.startMic(DEFAULT_ASR_FRAME_SIZE, () => {
      console.log('Mic stream closed unexpectedly');
      this.onError?.();
    });
    this.asr.start();
    if (initialMessage !== undefined) {
      this.handleInputUpdate(initialMessage, true);
    }
  }
  /**
   * Stops the chat.
   */
  stop() {
    this.asr.close();
    this.tts.close();
    this.micManager.stop();
    this.history = [];
    this.pendingRequests = {};
  }

  /**
   * Handle new input from the ASR.
   */
  private handleInputUpdate(text: string, final: boolean) {
    // Ignore partial transcripts if VAD indicates the user is still speaking.
    if (!final && this.micManager.isVoiceActive) {
      return;
    }

    // If the input text has been finalized, add it to the message history.
    const userMessage = new ChatMessage('user', text.trim());
    const newMessages = [...this.history, userMessage];
    if (final) {
      this.history = newMessages;
    }

    // If it doesn't match an existing request, kick off a new one.
    // If it matches an existing request and the text is finalized, speculative
    // execution worked! Snap forward to the current state of that request.
    const normalized = normalizeText(text);
    const hit = normalized in this.pendingRequests;
    console.log(`${final ? 'final' : 'partial'}: ${normalized} ${hit ? 'HIT' : 'MISS'}`);
    if (!hit) {
      const request = new ChatRequest(newMessages, this.model, this.docs, final);
      request.onUpdate = (request, newText) => this.handleRequestUpdate(request, newText);
      request.onComplete = (request) => this.handleRequestDone(request);
      this.pendingRequests[normalized] = request;
      request.start();
    } else if (final) {
      const request = this.pendingRequests[normalized];
      request.active = true;
      this.tts.play(request.outMessage);
      if (!request.done) {
        this.onOutputChange?.(request.outMessage, false, request.requestLatency!);
      } else {
        this.finishRequest(request);
      }
    }
  }
  /**
   * Handle new in-progress responses from the LLM. If the request is not marked
   * as active, it's a speculative request that we ignore for now.
   */
  private handleRequestUpdate(request: ChatRequest, newText: string) {
    if (request.active) {
      this.onOutputChange?.(request.outMessage, false, request.requestLatency!);
      this.tts.play(newText);
    }
  }
  /**
   * Handle a completed response from the LLM. If the request is not marked as
   * active, it's a speculative request that we ignore for now.
   */
  private handleRequestDone(request: ChatRequest) {
    // console.log(`request done, active=${request.active}`);
    if (request.active) {
      this.finishRequest(request);
    }
  }
  /**
   * Once a response is finalized, we can flush the TTS buffer and update the
   * chat history.
   */
  private finishRequest(request: ChatRequest) {
    this.tts.flush();
    const assistantMessage = new ChatMessage('assistant', request.outMessage);
    this.history.push(assistantMessage);
    this.pendingRequests = {};
    this.onOutputChange?.(request.outMessage, true, request.requestLatency!);
  }
}

const Dropdown: React.FC<{ label: string; param: string; value: string; options: string[] }> = ({
  param,
  label,
  value,
  options,
}) => (
  <>
    <label className="text-xs ml-2 font-bold">{label}</label>
    <select
      value={value}
      onChange={(e) => {
        const params = new URLSearchParams(window.location.search);
        params.set(param, e.target.value);
        window.location.search = params.toString();
      }}
      className="text-xs ml-1 pt-1 pb-1 border rounded"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </>
);

const MenuItem: React.FC<{ name: string; price: number }> = ({ name, price }) => (
  <li className="flex justify-between">
    <span className="text-left">{name}</span>
    <span className="text-right">${price}</span>
  </li>
);

const Button: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode }> = ({
  onClick,
  disabled,
  children,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`ml-2 rounded-md ${
      disabled ? 'bg-gray-300' : 'bg-fixie-charcoal hover:bg-fixie-dark-gray'
    } px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon`}
  >
    {children}
  </button>
);

const Latency: React.FC<{ name: string; latency: number }> = ({ name, latency }) => (
  <>
    {' '}
    {name} <span className="font-bold">{latency ? latency.toFixed(0) : '-'}</span> ms
  </>
);

const PageComponent: React.FC = () => {
  const searchParams = useSearchParams();
  const asrProvider = searchParams.get('asr') || DEFAULT_ASR_PROVIDER;
  const ttsProvider = searchParams.get('tts') || DEFAULT_TTS_PROVIDER;
  const ttsVoice = searchParams.get('ttsVoice') || undefined;
  const model = searchParams.get('llm') || DEFAULT_LLM;
  const docs = Boolean(searchParams.get('docs'));
  const showChooser = Boolean(searchParams.get('chooser'));
  const showInput = Boolean(!searchParams.get('noInput'));
  const showOutput = Boolean(!searchParams.get('noOutput'));
  const showStats = Boolean(searchParams.get('stats'));
  const [chatManager, setChatManager] = useState<ChatManager | null>(null);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [asrLatency, setAsrLatency] = useState(0);
  const [llmLatency, setLlmLatency] = useState(0);
  const [ttsLatency, setTtsLatency] = useState(0);
  const active = () => Boolean(chatManager);
  const handleStart = () => {
    const manager = new ChatManager({ asrProvider, ttsProvider, ttsVoice, model, docs });
    setInput('');
    setOutput('');
    setAsrLatency(0);
    setLlmLatency(0);
    setTtsLatency(0);
    setChatManager(manager);
    manager.start('');
    manager.onInputChange = (text, final, latency) => {
      setInput(text);
      if (latency) {
        setAsrLatency(latency);
      }
      setLlmLatency(0);
      setTtsLatency(0);
    };
    manager.onOutputChange = (text, final, latency) => {
      setOutput(text);
      if (final) {
        setInput('');
      }
      setLlmLatency((prev) => (prev ? prev : latency));
    };
    manager.onAudioStart = (latency) => {
      setTtsLatency(latency);
    };
    manager.onError = () => {
      chatManager!.stop();
      setChatManager(null);
    };
  };
  const handleStop = () => {
    if (!chatManager) {
      return;
    }
    chatManager!.stop();
    setChatManager(null);
  };
  const toggle = () => (chatManager ? handleStop() : handleStart());
  // Handle spacebar to start/stop.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.keyCode == 32) {
      toggle();
      event.preventDefault();
    }
  };
  // Install a keydown handler, and clean it up on unmount.
  useEffect(() => {
    // eslint-disable-next-line no-undef
    document.addEventListener('keydown', onKeyDown);
    return () => {
      // eslint-disable-next-line no-undef
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onKeyDown]);

  return (
    <>
      {showChooser && (
        <div className="absolute top-1 right-1">
          <Dropdown label="ASR" param="asr" value={asrProvider} options={ASR_PROVIDERS} />
          <Dropdown label="LLM" param="llm" value={model} options={LLM_MODELS} />
          <Dropdown label="TTS" param="tts" value={ttsProvider} options={TTS_PROVIDERS} />
        </div>
      )}
      <div className="w-full">
        <div className="flex justify-center mb-8">
          <Image src="/voice-logo.png" alt="Fixie Voice" width={322} height={98} priority={true} />
        </div>
        <p className="font-sm ml-2 mb-6 text-center">
          This demo allows you to chat (via voice) with a drive-thru agent at a fictional donut shop. Click Start
          Chatting (or tap the spacebar) to begin.
        </p>
        <div className="grid grid-cols-2 lg:gap-x-24">
          <div className="p-4">
            <p className="text-lg font-bold">🍩 DONUTS</p>
            <ul className="text-sm">
              <MenuItem name="PUMPKIN SPICE ICED" price={1.29} />
              <MenuItem name="PUMPKIN SPICE CAKE" price={1.29} />
              <MenuItem name="OLD FASHIONED" price={0.99} />
              <MenuItem name="CHOCOLATE ICED" price={1.09} />
              <MenuItem name="CHOCOLATE ICED WITH SPRINKLES" price={1.09} />
              <MenuItem name="RASPBERRY FILLED" price={1.09} />
              <MenuItem name="BLUEBERRY CAKE" price={1.09} />
              <MenuItem name="STRAWBERRY ICED WITH SPRINKLES" price={1.09} />
              <MenuItem name="LEMON FILLED" price={1.09} />
              <MenuItem name="DOUGHNUT HOLES" price={3.99} />
            </ul>
          </div>
          <div className="p-4">
            <p className="text-lg font-bold">☕️ COFFEE</p>
            <ul className="text-sm">
              <MenuItem name="PUMPKIN SPICE COFFEE" price={2.59} />
              <MenuItem name="PUMPKIN SPICE LATTE" price={4.59} />
              <MenuItem name="REGULAR BREWED COFFEE" price={1.79} />
              <MenuItem name="DECAF BREWED COFFEE" price={1.79} />
              <MenuItem name="LATTE" price={3.49} />
              <MenuItem name="CAPPUCINO" price={3.49} />
              <MenuItem name="CARAMEL MACCHIATO" price={3.49} />
              <MenuItem name="MOCHA LATTE" price={3.49} />
              <MenuItem name="CARAMEL MOCHA LATTE" price={3.49} />
            </ul>
          </div>
        </div>
        <div>
          {showOutput && (
            <div
              className="text-center m-2 w-full text-md py-8 px-2 rounded-lg border-2 bg-fixie-light-dust flex items-center justify-center"
              id="output"
            >
              {output}
            </div>
          )}
        </div>
        <div>
          {showInput && (
            <div
              className={`m-2 w-full text-md h-12 rounded-lg border-2 bg-fixie-light-dust flex items-center justify-center ${
                active() ? 'border-red-400' : ''
              }`}
              id="input"
            >
              {input}
            </div>
          )}
        </div>
        <div className="m-3 w-full flex justify-center mt-8">
          <Button disabled={false} onClick={toggle}>
            {active() ? 'Stop Chatting' : 'Start Chatting'}
          </Button>
        </div>
        {showStats && (
          <div className="flex justify-center">
            <span className="text-sm font-mono">
              <Latency name="ASR" latency={asrLatency} /> |
              <Latency name="LLM" latency={llmLatency} /> |
              <Latency name="TTS" latency={ttsLatency} /> |
              <Latency name="" latency={asrLatency + llmLatency + ttsLatency} />
            </span>
          </div>
        )}
      </div>
    </>
  );
};

export default PageComponent;
