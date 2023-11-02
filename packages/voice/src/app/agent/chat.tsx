import {
  createSpeechRecognition,
  normalizeText,
  SpeechRecognitionBase,
  MicManager,
  Transcript,
} from 'ai-jsx/lib/asr/asr';
import { createTextToSpeech, BuildUrlOptions, TextToSpeechBase, TextToSpeechProtocol } from 'ai-jsx/lib/tts/tts';

const DEFAULT_ASR_FRAME_SIZE = 20;

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
  const response = await fetch('/tts/api/token/edge', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });
  const json = await response.json();
  return json.token;
}

/**
 * Builds a URL for use in a TTS service.
 */
function buildTtsUrl(options: BuildUrlOptions) {
  const runtime = options.provider.endsWith('-grpc') ? 'nodejs' : 'edge';
  const params = new URLSearchParams();
  Object.entries(options).forEach(([k, v]) => v != undefined && params.set(k, v.toString()));
  return `/tts/api/generate/${runtime}?${params}`;
}

/**
 * A single message in the chat history.
 */
export class ChatMessage {
  constructor(public readonly role: string, public readonly content: string, public readonly conversationId?: string) {}
}

/**
 * Transforms a text stream of JSON lines into a stream of JSON objects.
 */
function jsonLinesTransformer() {
  let buffer = '';
  return new TransformStream<string, any>({
    async transform(chunk, controller) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop()!;
      for (const line of lines) {
        if (line.trim()) {
          controller.enqueue(JSON.parse(line));
        }
      }
    },
  });
}

/**
 * A single request to the LLM, which may be speculative.
 */
export class ChatRequest {
  public outMessage = '';
  public conversationId?: string;
  public done = false;
  public onUpdate?: (request: ChatRequest, newText: string) => void;
  public onComplete?: (request: ChatRequest) => void;
  public startMillis?: number;
  public requestLatency?: number;
  public streamLatency?: number;
  constructor(
    private readonly inMessages: ChatMessage[],
    private readonly model: string,
    private readonly agentId: string,
    private readonly docs: boolean,
    public active: boolean
  ) {
    this.conversationId = inMessages.find((m) => m.conversationId)?.conversationId;
  }

  async start() {
    console.log(`[chat] calling agent for "${this.inMessages.at(-1)?.content}"`);
    if (this.model === 'fixie') {
      await this.startWithFixie(this.agentId);
    } else {
      await this.startWithLlm(this.agentId);
    }
  }

  private async startWithLlm(agentId: string) {
    this.startMillis = performance.now();

    const res = await fetch('/agent/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: this.inMessages, model: this.model, agentId, docs: this.docs }),
    });
    const reader = res.body!.getReader();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        this.ensureComplete();
        break;
      }
      const newText = new TextDecoder().decode(value);
      if (newText.trim() && this.requestLatency === undefined) {
        this.requestLatency = performance.now() - this.startMillis;
        console.log(`[chat] received agent response, latency=${this.requestLatency.toFixed(0)} ms`);
      }

      this.outMessage += newText;
      this.onUpdate?.(this, newText);
    }
  }

  private async startWithFixie(agentId: string) {
    this.startMillis = performance.now();

    let isStartConversationRequest;
    let response;
    if (this.conversationId) {
      isStartConversationRequest = false;
      response = await fetch(
        `https://api.fixie.ai/api/v1/agents/${agentId}/conversations/${this.conversationId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            message: this.inMessages.at(-1)!.content,
          }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      isStartConversationRequest = true;
      response = await fetch(`https://api.fixie.ai/api/v1/agents/${agentId}/conversations`, {
        method: 'POST',
        body: JSON.stringify({
          message: this.inMessages.at(-1)!.content,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      this.conversationId = response.headers.get('X-Fixie-Conversation-Id')!;
      console.log(
        `To view conversation transcript see https://embed.fixie.ai/agents/${agentId}/conversations/${this.conversationId}`
      );
    }

    const reader = response.body!.pipeThrough(new TextDecoderStream()).pipeThrough(jsonLinesTransformer()).getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        this.ensureComplete();
        break;
      }

      if (!this.done) {
        const currentTurn = isStartConversationRequest ? value.turns.at(-1) : value;
        const currentMessage = currentTurn.messages
          .filter((m: any) => m.kind === 'text')
          .map((m: any) => m.content)
          .join('');

        if (currentMessage === this.outMessage) {
          continue;
        }

        // Find the longest matching prefix.
        let i = 0;
        while (i < currentMessage.length && i < this.outMessage.length && currentMessage[i] === this.outMessage[i]) {
          i++;
        }
        if (i !== this.outMessage.length) {
          console.error('Result was not an append to the previous result.');
        }
        const delta = currentMessage.slice(i);

        if (delta.trim() && this.requestLatency === undefined) {
          this.requestLatency = performance.now() - this.startMillis;
          console.log(`Got Fixie response, latency=${this.requestLatency.toFixed(0)}`);
        }

        this.outMessage = currentMessage;
        this.onUpdate?.(this, delta);

        if (currentTurn.state === 'done') {
          this.ensureComplete();
          break;
        }
      }
    }
  }

  private ensureComplete() {
    if (!this.done) {
      this.done = true;
      if (this.startMillis !== undefined && this.requestLatency !== undefined) {
        this.streamLatency = performance.now() - this.startMillis - this.requestLatency;
      }
      this.onComplete?.(this);
    }
  }
}

export enum ChatManagerState {
  IDLE = 'idle',
  LISTENING = 'listening',
  THINKING = 'thinking',
  SPEAKING = 'speaking',
}

interface ChatManagerInit {
  asrProvider: string;
  ttsProvider: string;
  model: string;
  agentId: string;
  docs: boolean;
  asrLanguage?: string;
  ttsVoice?: string;
}

/**
 * Manages a single chat with a LLM, including speculative execution.
 */
export class ChatManager {
  private _state = ChatManagerState.IDLE;
  private history: ChatMessage[] = [];
  private pendingRequests = new Map<string, ChatRequest>();
  private readonly micManager: MicManager;
  private readonly asr: SpeechRecognitionBase;
  private readonly tts: TextToSpeechBase;
  private readonly model: string;
  private readonly agentId: string;
  private readonly docs: boolean;
  onStateChange?: (state: ChatManagerState) => void;
  onInputChange?: (text: string, final: boolean, latency?: number) => void;
  onOutputChange?: (text: string, final: boolean, latency: number) => void;
  onAudioGenerate?: (latency: number) => void;
  onAudioStart?: (latency: number) => void;
  onAudioEnd?: () => void;
  onError?: () => void;
  constructor({ asrProvider, asrLanguage, ttsProvider, ttsVoice, model, agentId, docs }: ChatManagerInit) {
    this.micManager = new MicManager();
    this.asr = createSpeechRecognition({
      provider: asrProvider,
      manager: this.micManager,
      getToken: getAsrToken,
      language: asrLanguage,
    });
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
    this.agentId = agentId;
    this.docs = docs;
    this.asr.addEventListener('transcript', (evt: Event) => this.handleTranscript(evt));
    this.tts.onGenerating = () => this.handleGenerationStart();
    this.tts.onPlaying = () => this.handlePlaybackStart();
    this.tts.onComplete = () => this.handlePlaybackComplete();
  }

  get state() {
    return this._state;
  }
  get inputAnalyzer() {
    return this.micManager.analyzer;
  }
  get outputAnalyzer() {
    return this.tts.analyzer;
  }

  /**
   * Starts the chat.
   */
  async start(initialMessage?: string) {
    await this.micManager.startMic(DEFAULT_ASR_FRAME_SIZE, () => {
      console.warn('[chat] Mic stream closed unexpectedly');
      this.onError?.();
    });
    this.asr.start();
    if (initialMessage !== undefined) {
      this.handleInputUpdate(initialMessage, true);
    } else {
      this.changeState(ChatManagerState.LISTENING);
    }
  }
  /**
   * Stops the chat.
   */
  stop() {
    this.changeState(ChatManagerState.IDLE);
    this.asr.close();
    this.tts.close();
    this.micManager.stop();
    this.history = [];
    this.pendingRequests.clear();
  }

  /**
   * If the assistant is thinking or speaking, interrupt it and start listening again.
   * If the assistant is speaking, the generated assistant message will be retained in history.
   */
  interrupt() {
    if (this._state == ChatManagerState.THINKING || this._state == ChatManagerState.SPEAKING) {
      this.cancelRequests();
      this.tts.stop();
      this.micManager.isEnabled = true;
      this.changeState(ChatManagerState.LISTENING);
    }
  }

  private changeState(state: ChatManagerState) {
    if (state != this._state) {
      console.log(`[chat] ${this._state} -> ${state}`);
      this._state = state;
      this.onStateChange?.(state);
    }
  }

  /**
   * Handle new input from the ASR.
   */
  private handleTranscript(evt: Event) {
    if (this._state != ChatManagerState.LISTENING && this._state != ChatManagerState.THINKING) return;
    const obj = (evt as CustomEventInit<Transcript>).detail!;
    this.handleInputUpdate(obj.text, obj.final, obj.observedLatency);
  }

  private handleInputUpdate(text: string, final: boolean, latency?: number) {
    // Update the received ASR latency stat to account for our speculative execution.
    const normalized = normalizeText(text);
    const request = this.pendingRequests.get(normalized);
    let adjustedLatency = latency;
    if (adjustedLatency && final && request) {
      adjustedLatency -= performance.now() - request.startMillis!;
    }
    console.log(
      `[chat] asr transcript="${normalized}" ${request ? 'HIT' : 'MISS'}${
        final ? ' FINAL' : ''
      } latency=${adjustedLatency?.toFixed(0)} ms`
    );
    this.onInputChange?.(text, final, latency);

    // Ignore partial transcripts if VAD indicates the user is still speaking.
    if (!final && this.micManager.isVoiceActive) {
      return;
    }

    this.changeState(ChatManagerState.THINKING);

    // If the input text has been finalized, add it to the message history.
    const userMessage = new ChatMessage('user', text.trim());
    const newMessages = [...this.history, userMessage];
    if (final) {
      this.history = newMessages;
      this.micManager.isEnabled = false;
    }

    // If it doesn't match an existing request, kick off a new one.
    // If it matches an existing request and the text is finalized, speculative
    // execution worked! Snap forward to the current state of that request.
    const supportsSpeculativeExecution = this.model !== 'fixie';
    if (!request && (final || supportsSpeculativeExecution)) {
      this.dispatchRequest(normalized, newMessages, final);
    } else if (final) {
      this.activateRequest(request!);
    }
  }
  /**
   * Send off a new request to the LLM.
   */
  private dispatchRequest(normalized: string, messages: ChatMessage[], final: boolean) {
    const request = new ChatRequest(messages, this.model, this.agentId, this.docs, final);
    request.onUpdate = (request, newText) => this.handleRequestUpdate(request, newText);
    request.onComplete = (request) => this.handleRequestDone(request);
    this.pendingRequests.set(normalized, request);
    request.start();
  }
  /**
   * Activate a request that was previously dispatched.
   */
  private activateRequest(request: ChatRequest) {
    request.active = true;
    this.tts.play(request.outMessage);
    if (!request.done) {
      this.onOutputChange?.(request.outMessage, false, request.requestLatency!);
    } else {
      this.finishRequest(request);
    }
  }
  /**
   * Cancel all pending requests.
   */
  private cancelRequests() {
    for (const request of this.pendingRequests.values()) {
      request.active = false;
    }
    this.pendingRequests.clear();
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
    const assistantMessage = new ChatMessage('assistant', request.outMessage, request.conversationId);
    this.history.push(assistantMessage);
    this.pendingRequests.clear();
    this.onOutputChange?.(request.outMessage, true, request.requestLatency!);
  }
  /**
   * Handle the start of generation from the TTS.
   */
  private handleGenerationStart() {
    if (this._state != ChatManagerState.THINKING) return;
    this.onAudioGenerate?.(this.tts.bufferLatency!);
  }
  /**
   * Handle the start of playout from the TTS.
   */
  private handlePlaybackStart() {
    if (this._state != ChatManagerState.THINKING) return;
    this.changeState(ChatManagerState.SPEAKING);
    this.onAudioStart?.(this.tts.latency! - this.tts.bufferLatency!);
  }
  /**
   * Handle the end of playout from the TTS.
   */
  private handlePlaybackComplete() {
    if (this._state != ChatManagerState.SPEAKING) return;
    this.onAudioEnd?.();
    this.micManager.isEnabled = true;
    this.changeState(ChatManagerState.LISTENING);
  }
}
