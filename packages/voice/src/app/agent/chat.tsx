import {
  createSpeechRecognition,
  normalizeText,
  SpeechRecognitionBase,
  MicManager,
  Transcript,
} from 'ai-jsx/lib/asr/asr';
import { createTextToSpeech, BuildUrlOptions, TextToSpeechBase, TextToSpeechProtocol } from 'ai-jsx/lib/tts/tts';
import {
  createLocalTracks,
  DataPacket_Kind,
  LocalAudioTrack,
  RemoteAudioTrack,
  RemoteTrack,
  Room,
  RoomEvent,
  Track,
  TrackEvent,
} from 'livekit-client';

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
  public onUpdate?: (request: ChatRequest, newText: string, firstToken: boolean) => void;
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

      const firstToken = this.outMessage.length === 0;
      this.outMessage += newText;
      this.onUpdate?.(this, newText, firstToken);
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
    let firstToken = true;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        this.ensureComplete();
        break;
      }

      if (!this.done) {
        const currentTurn = isStartConversationRequest ? value.turns.at(-1) : value;

        const textMessages = currentTurn.messages.filter((m: any) => m.kind === 'text');
        let currentMessage = '';
        for (const textMessage of textMessages) {
          currentMessage += textMessage.content;
          const messageState = textMessage.state;
          if (messageState === 'in-progress') {
            // This message is still being generated, so don't include any text after it.
            break;
          } else if (messageState === 'done') {
            // Append two newlines to end the paragraph (i.e. make clear to the TTS pipeline that the text is complete).
            currentMessage += '\n\n';
          }
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
        this.onUpdate?.(this, delta, firstToken);
        firstToken = false;

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

export interface ChatManagerInit {
  asrProvider: string;
  ttsProvider: string;
  model: string;
  agentId: string;
  docs: boolean;
  asrModel?: string;
  asrLanguage?: string;
  ttsModel?: string;
  ttsVoice?: string;
  webrtcUrl?: string;
}

/**
 * Abstract interface for a voice-based LLM chat session.
 */
export interface ChatManager {
  onStateChange?: (state: ChatManagerState) => void;
  onInputChange?: (text: string, final: boolean) => void;
  onOutputChange?: (text: string, final: boolean) => void;
  onLatencyChange?: (kind: string, latency: number) => void;
  onError?: () => void;

  state: ChatManagerState;
  inputAnalyzer?: AnalyserNode;
  outputAnalyzer?: AnalyserNode;
  start(initialMessage?: string): Promise<void>;
  stop(): void;
  interrupt(): void;
}

/**
 * Manages a single chat with a LLM, including speculative execution.
 * All RPCs are managed from within the browser context.
 */
export class LocalChatManager implements ChatManager {
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
  onInputChange?: (text: string, final: boolean) => void;
  onOutputChange?: (text: string, final: boolean) => void;
  onLatencyChange?: (kind: string, latency: number) => void;
  onError?: () => void;
  constructor({ asrProvider, asrLanguage, ttsProvider, ttsModel, ttsVoice, model, agentId, docs }: ChatManagerInit) {
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
      model: ttsModel,
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
    this.onInputChange?.(text, final);

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
      this.onLatencyChange?.('asr', adjustedLatency!);
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
    request.onUpdate = (request, newText, firstToken) => this.handleRequestUpdate(request, newText, firstToken);
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
      this.onOutputChange?.(request.outMessage, false);
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
  private handleRequestUpdate(request: ChatRequest, newText: string, firstToken: boolean) {
    if (request.active) {
      this.onOutputChange?.(request.outMessage, false);
      if (firstToken) {
        this.onLatencyChange?.('llm', request.streamLatency!);
      }
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
    this.onOutputChange?.(request.outMessage, true);
  }
  /**
   * Handle the start of generation from the TTS.
   */
  private handleGenerationStart() {
    if (this._state != ChatManagerState.THINKING) return;
    this.onLatencyChange?.('llmt', this.tts.bufferLatency!);
  }
  /**
   * Handle the start of playout from the TTS.
   */
  private handlePlaybackStart() {
    if (this._state != ChatManagerState.THINKING) return;
    this.changeState(ChatManagerState.SPEAKING);
    this.onLatencyChange?.('tts', this.tts.latency! - this.tts.bufferLatency!);
  }
  /**
   * Handle the end of playout from the TTS.
   */
  private handlePlaybackComplete() {
    if (this._state != ChatManagerState.SPEAKING) return;
    this.micManager.isEnabled = true;
    this.changeState(ChatManagerState.LISTENING);
  }
}

export class StreamAnalyzer {
  source: MediaStreamAudioSourceNode;
  analyzer: AnalyserNode;
  constructor(context: AudioContext, stream: MediaStream) {
    this.source = context.createMediaStreamSource(stream);
    this.analyzer = context.createAnalyser();
    this.source.connect(this.analyzer);
  }
  stop() {
    this.source.disconnect();
  }
}

/**
 * Manages a single chat with a LLM, including speculative execution.
 * All RPCs are performed remotely, and audio is streamed to/from the server via WebRTC.
 */
export class WebRtcChatManager implements ChatManager {
  private params: ChatManagerInit;
  private audioContext = new AudioContext();
  private audioElement = new Audio();
  private textEncoder = new TextEncoder();
  private textDecoder = new TextDecoder();
  private _state = ChatManagerState.IDLE;
  private socket?: WebSocket;
  private room?: Room;
  private localAudioTrack?: LocalAudioTrack;
  /** True when we should have entered speaking state but didn't due to analyzer not being ready. */
  private delayedSpeakingState = false;
  private inAnalyzer?: StreamAnalyzer;
  private outAnalyzer?: StreamAnalyzer;
  private pinger?: NodeJS.Timer;
  onStateChange?: (state: ChatManagerState) => void;
  onInputChange?: (text: string, final: boolean) => void;
  onOutputChange?: (text: string, final: boolean) => void;
  onLatencyChange?: (kind: string, latency: number) => void;
  onError?: () => void;

  constructor(params: ChatManagerInit) {
    this.params = params;
    this.audioElement = new Audio();
    this.warmup();
  }
  get state() {
    return this._state;
  }
  get inputAnalyzer() {
    return this.inAnalyzer?.analyzer;
  }
  get outputAnalyzer() {
    return this.outAnalyzer?.analyzer;
  }
  warmup() {
    const isLocalHost = window.location.hostname === 'localhost';
    const url = this.params.webrtcUrl || (!isLocalHost ? 'wss://wsapi.fixie.ai' : 'ws://localhost:8100');
    this.socket = new WebSocket(url);
    this.socket.onopen = () => this.handleSocketOpen();
    this.socket.onmessage = (event) => this.handleSocketMessage(event);
    this.socket.onclose = (event) => this.handleSocketClose(event);
  }
  async start() {
    console.log('[chat] starting');
    this.audioContext.resume();
    this.audioElement.play();
    const localTracks = await createLocalTracks({ audio: true, video: false });
    this.localAudioTrack = localTracks[0] as LocalAudioTrack;
    console.log('[chat] got mic stream');
    this.inAnalyzer = new StreamAnalyzer(this.audioContext, this.localAudioTrack!.mediaStream!);
    this.pinger = setInterval(() => {
      const obj = { type: 'ping', timestamp: performance.now() };
      this.sendData(obj);
    }, 5000);
    this.maybePublishLocalAudio();
  }
  async stop() {
    console.log('[chat] stopping');
    clearInterval(this.pinger);
    this.pinger = undefined;
    await this.room?.disconnect();
    this.room = undefined;
    this.inAnalyzer?.stop();
    this.outAnalyzer?.stop();
    this.inAnalyzer = undefined;
    this.outAnalyzer = undefined;
    this.localAudioTrack?.stop();
    this.localAudioTrack = undefined;
    this.socket?.close();
    this.socket = undefined;
    this.changeState(ChatManagerState.IDLE);
  }
  interrupt() {
    console.log('[chat] interrupting');
    const obj = { type: 'interrupt' };
    this.sendData(obj);
  }
  private changeState(state: ChatManagerState) {
    if (state != this._state) {
      console.log(`[chat] ${this._state} -> ${state}`);
      this._state = state;
      this.onStateChange?.(state);
    }
  }
  private maybePublishLocalAudio() {
    if (this.room && this.room.state == 'connected' && this.localAudioTrack) {
      console.log(`[chat] publishing local audio track`);
      const opts = { name: 'audio', simulcast: false, source: Track.Source.Microphone };
      this.room.localParticipant.publishTrack(this.localAudioTrack, opts);
    }
  }
  private sendData(obj: any) {
    this.room?.localParticipant.publishData(this.textEncoder.encode(JSON.stringify(obj)), DataPacket_Kind.RELIABLE);
  }
  private handleSocketOpen() {
    console.log('[chat] socket opened');
    const obj = {
      type: 'init',
      params: {
        asr: {
          provider: this.params.asrProvider,
          model: this.params.asrModel,
          language: this.params.asrLanguage,
        },
        tts: {
          provider: this.params.ttsProvider,
          model: this.params.ttsModel,
          voice: this.params.ttsVoice,
        },
        agent: {
          model: this.params.model,
          agentId: this.params.agentId,
          docs: this.params.docs,
        },
      },
    };
    this.socket?.send(JSON.stringify(obj));
  }
  private async handleSocketMessage(event: MessageEvent) {
    const msg = JSON.parse(event.data);
    switch (msg.type) {
      case 'room_info':
        this.room = new Room();
        this.room.on(RoomEvent.TrackSubscribed, (track) => this.handleTrackSubscribed(track));
        this.room.on(RoomEvent.DataReceived, (payload, participant) => this.handleDataReceived(payload, participant));
        await this.room.connect(msg.roomUrl, msg.token);
        console.log('[chat] connected to room', this.room.name);
        this.maybePublishLocalAudio();
        break;
      default:
        console.warn('unknown message type', msg.type);
    }
  }
  private handleSocketClose(event: CloseEvent) {
    if (event.code === 1000) {
      // We initiated this shutdown, so we've already cleaned up.
      // Reconnect to prepare for the next session.
      console.log('[chat] socket closed normally');
      this.warmup();
    } else if (event.code === 1006) {
      // This occurs when running a Next.js app in debug mode and the ChatManager is
      // initialized twice, the first socket will receive this error that we can ignore.
    } else {
      console.warn(`[chat] socket closed unexpectedly: ${event.code} ${event.reason}`);
      this.onError?.();
    }
  }
  private handleTrackSubscribed(track: RemoteTrack) {
    console.log(`[chat] subscribed to remote audio track ${track.sid}`);
    const audioTrack = track as RemoteAudioTrack;
    audioTrack.on(TrackEvent.AudioPlaybackStarted, () => console.log(`[chat] audio playback started`));
    audioTrack.on(TrackEvent.AudioPlaybackFailed, (err) => console.error(`[chat] audio playback failed`, err));
    audioTrack.attach(this.audioElement);
    this.outAnalyzer = new StreamAnalyzer(this.audioContext, track.mediaStream!);
    if (this.delayedSpeakingState) {
      this.delayedSpeakingState = false;
      this.changeState(ChatManagerState.SPEAKING);
    }
  }
  private handleDataReceived(payload: Uint8Array, participant: any) {
    const data = JSON.parse(this.textDecoder.decode(payload));
    if (data.type === 'pong') {
      const elapsed_ms = performance.now() - data.timestamp;
      console.debug(`[chat] worker RTT: ${elapsed_ms.toFixed(0)} ms`);
    } else if (data.type === 'state') {
      const newState = data.state;
      if (newState === ChatManagerState.SPEAKING && this.outAnalyzer === undefined) {
        // Skip the first speaking state, before we've attached the audio element.
        // handleTrackSubscribed will be called soon and will change the state.
        this.delayedSpeakingState = true;
      } else {
        this.changeState(newState);
      }
    } else if (data.type === 'transcript') {
      this.handleInputChange(data.transcript);
    } else if (data.type === 'output') {
      this.handleOutputChange(data.text, data.final);
    } else if (data.type == 'latency') {
      this.handleLatency(data.kind, data.value);
    }
  }
  private handleInputChange(transcript: Transcript) {
    const finalText = transcript.final ? ' FINAL' : '';
    console.log(`[chat] input: ${transcript.text}${finalText}`);
    this.onInputChange?.(transcript.text, transcript.final);
  }
  private handleOutputChange(text: string, final: boolean) {
    console.log(`[chat] output: ${text}`);
    this.onOutputChange?.(text, final);
  }
  private handleLatency(kind: string, value: number) {
    console.log(`[chat] latency: ${kind} ${value.toFixed(0)} ms`);
    this.onLatencyChange?.(kind, value);
  }
}

export function createChatManager(init: ChatManagerInit): ChatManager {
  if (init.webrtcUrl !== '0') {
    return new WebRtcChatManager(init);
  } else {
    return new LocalChatManager(init);
  }
}
