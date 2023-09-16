'use client';
import React, { useEffect, useState } from 'react';
import { createSpeechRecognition, SpeechRecognitionBase, MicManager, Transcript } from 'ai-jsx/lib/asr/asr';
import { createTextToSpeech, TextToSpeechBase } from 'ai-jsx/lib/tts/tts';
import { useSearchParams } from 'next/navigation';
import '../globals.css';

// latency map
// shorter initial messages
// caching or other initial startup opt?
// tts bargein?

const DEFAULT_ASR_FRAME_SIZE = 100;
const DEFAULT_ASR_PROVIDER = 'deepgram';
const DEFAULT_TTS_PROVIDER = 'azure';

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
  constructor(private readonly inMessages: ChatMessage[], private readonly model: string, public active: boolean) {}
  async start() {
    console.log(`calling LLM for ${this.inMessages[this.inMessages.length - 1].content}`);
    const startTime = performance.now();
    const res = await fetch('/agent/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: this.inMessages, model: this.model }),
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

class ChatManagerInit {
  constructor(
    public readonly asrProvider: string,
    public readonly ttsProvider: string,
    public readonly model: string
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
  onInputChange?: (text: string, final: boolean) => void;
  onOutputChange?: (text: string, final: boolean) => void;
  onError?: () => void;
  constructor({ asrProvider, ttsProvider, model }: ChatManagerInit) {
    this.micManager = new MicManager();
    this.asr = createSpeechRecognition({ provider: asrProvider, manager: this.micManager, getToken: getAsrToken });
    this.tts = createTextToSpeech({ provider: ttsProvider, getToken: getTtsToken, buildUrl: buildTtsUrl, rate: 1.2 });
    this.model = model;
    this.asr.addEventListener('transcript', (event: CustomEventInit<Transcript>) => {
      const obj = event.detail!;
      this.handleInputUpdate(obj.text, obj.final);
      this.onInputChange?.(obj.text, obj.final);
    });
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
    if (initialMessage) {
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
    // If the input text has been finalized, add it to the message history.
    const userMessage = new ChatMessage('user', text);
    const newMessages = [...this.history, userMessage];
    if (final) {
      this.history = newMessages;
    }

    // If it doesn't match an existing request, kick off a new one.
    // If it matches an existing request and the text is finalized, speculative
    // execution worked! Snap forward to the current state of that request.
    const hit = text in this.pendingRequests;
    console.log(`${final ? 'final' : 'partial'}: ${text} ${hit ? 'HIT' : 'MISS'}`);
    if (!hit) {
      const request = new ChatRequest(newMessages, this.model, final);
      request.onUpdate = (request, newText) => this.handleRequestUpdate(request, newText);
      request.onComplete = (request) => this.handleRequestDone(request);
      this.pendingRequests[text] = request;
      request.start();
    } else if (final) {
      const request = this.pendingRequests[text];
      request.active = true;
      this.tts.play(request.outMessage);
      if (!request.done) {
        this.onOutputChange?.(request.outMessage, false);
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
      this.onOutputChange?.(request.outMessage, false);
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
    this.onOutputChange?.(request.outMessage, true);
  }
}

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

const PageComponent: React.FC = () => {
  const searchParams = useSearchParams();
  const asrProvider = searchParams.get('asr') || DEFAULT_ASR_PROVIDER;
  const ttsProvider = searchParams.get('tts') || DEFAULT_TTS_PROVIDER;
  const model = searchParams.get('llm') || 'gpt-4';
  const [chatManager, setChatManager] = useState<ChatManager | null>(null);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const active = () => Boolean(chatManager);
  const handleStart = () => {
    const manager = new ChatManager({ asrProvider, ttsProvider, model });
    setInput('');
    setOutput('');
    setChatManager(manager);
    manager.start('Hi!');
    manager.onInputChange = (text) => {
      setInput(text);
    };
    manager.onOutputChange = (text, final) => {
      setOutput(text);
      if (final) {
        setInput('');
      }
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
    }
    event.preventDefault();
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
      <div className="w-full">
        <p className="font-sm ml-2 mb-2">
          This demo allows you to chat (via voice) with a drive-thru agent at a Krispy Kreme. Click Start Chatting (or
          tap the spacebar) to begin.
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
          <div
            className="m-2 w-full text-xl h-32 rounded-lg border-2 bg-fixie-light-dust flex items-center justify-center"
            id="output"
          >
            {output}
          </div>
        </div>
        <div>
          <div
            className={`m-2 w-full text-xl h-12 rounded-lg border-2 bg-fixie-light-dust flex items-center justify-center ${
              active() ? 'border-red-400' : ''
            }`}
            id="input"
          >
            {input}
          </div>
        </div>
        <div className="m-3 w-full flex justify-center">
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
