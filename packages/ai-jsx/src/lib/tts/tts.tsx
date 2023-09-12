'use client';
import { split } from 'sentence-splitter';

/**
 * A function that can be used to build a URL for a text-to-speech
 * service. This URL will be used to retrieve an audio file that can be
 * played by an HTML5 audio element.
 */
export type BuildUrl = (provider: string, voice: string, rate: number, text: string) => string;

/**
 * Defines a function that can be used to retrieve an ephemeral access token
 * for us with a text-to-speech service. Typically, this will be a
 * fetch request to a server that will return an opaque token.
 */
export type GetToken = (provider: string) => Promise<string>;

/**
 * Defines a base class for text-to-speech services. This class provides
 * a common interface for text-to-speech services, as well as some basic
 * infrastructure for playing audio using the HTML5 audio element.
 */
export abstract class TextToSpeechBase {
  protected audio: HTMLAudioElement;
  /**
   * The time (performance.now()) when the play() method was first called.
   */
  protected playMillis: number = 0;
  /**
   * The latency between when the play() method is called and when the audio starts playing.
   */
  public latency: number = 0.0;
  /**
   * Called when the generated audio has started playing.
   */
  public onPlaying?: () => void;
  /**
   * Called when the generated audio has finished playing out.
   */
  public onComplete?: () => void;

  constructor(protected readonly name: string) {
    this.audio = new Audio();
    this.audio.onplay = () => console.log(`[${this.name}] tts playing`);
    this.audio.onpause = () => console.log(`[${this.name}] tts paused`);
    this.audio.onloadstart = () => console.log(`[${this.name}] tts loadstart`);
    this.audio.onloadeddata = () => console.log(`[${this.name}] tts loadeddata`);
    this.audio.oncanplay = () => console.log(`[${this.name}] tts canplay`);
    this.audio.onplaying = () => {
      console.log(`[${this.name}] tts playing`);
      if (this.playMillis) {
        this.latency = Math.floor(performance.now() - this.playMillis);
        console.log(`[${this.name}] tts play latency: ${this.latency} ms`);
      }
      this.onPlaying?.();
    };
  }
  /**
   * Converts the given text to speech and plays it using the HTML5 audio element.
   * This method may be called multiple times, and the audio will be played serially.
   * Generation may be buffered, use the flush() method to indicate all text has been provided.
   * During playout, use skip() to stop the current playout, or stop() to end all generation
   * and close any resources.

   */
  abstract play(_text: string): void;
  /**
   * Flushes any text buffered by a previous play() call.
   */
  abstract flush(): void;

  /**
   * Discards any generated audio, but remains in an active state so
   * that additional text can be provided and played.
   */
  abstract stop(): void;
  /**
   * Stops playing any generated audio and ends generation.
   */
  abstract close(): void;
}

/**
 * A text-to-speech service that requests audio from a server and
 * plays it in one shot using the HTML5 audio element. The URL to request
 * audio from the server is constructed using the provided BuildUrlFunction,
 * allowing this class to be used with a variety of text-to-speech services.
 */
export class SimpleTextToSpeech extends TextToSpeechBase {
  constructor(
    name: string,
    protected readonly urlFunc: BuildUrl,
    private readonly voice: string,
    private readonly rate = 1.0
  ) {
    super(name);
  }
  play(text: string) {
    this.playMillis = performance.now();
    this.audio.src = this.urlFunc(this.name, this.voice, this.rate, text);
    this.audio.play();
  }
  flush() {}
  stop() {
    console.log(`[${this.name}] tts stopping`);
    this.audio.src = '';
  }
  close() {
    console.log(`[${this.name}] tts closing`);
    this.audio.pause();
  }
}

class AudioChunk {
  public readonly timestamp: number;
  constructor(public buffer?: ArrayBuffer) {
    this.timestamp = performance.now();
  }
}

/**
 * Defines a text-to-speech service that requests individual audio utterances
 * from a server and plays them in series using HTML5's Media Source Extensions.
 * This approach reduces latency by allowing the audio to be streamed as it is
 * generated, rather than waiting for the entire audio file to be generated. It also
 * allows text to be fed to the service in a stream rather than all at once. This
 * class is not meant to be used directly, but provides infrastructure for
 * RestTextToSpeech and WebSocketTextToSpeech.
 */
class MseTextToSpeech extends TextToSpeechBase {
  private readonly mediaSource: MediaSource = new MediaSource();
  private sourceBuffer?: SourceBuffer;
  private readonly chunkBuffer: AudioChunk[] = [];
  private inProgress = false;

  constructor(name: string) {
    super(name);
    this.audio.src = URL.createObjectURL(this.mediaSource);
    this.audio.onwaiting = () => {
      console.log(`[${this.name}] tts waiting`);
      if (!this.inProgress) {
        this.onComplete?.();
      }
    };
    this.mediaSource.onsourceopen = () => {
      if (!this.sourceBuffer) {
        this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/mpeg');
        this.sourceBuffer.onupdateend = () => {
          this.processChunkBuffer();
        };
      }
    };
  }
  play(text: string) {
    if (this.audio.readyState == 0) {
      console.log(`[${this.name}] tts starting play`);
      this.audio.play();
    }
    if (!this.inProgress) {
      this.playMillis = performance.now();
      this.inProgress = true;
    }
    this.generate(text);
  }
  flush() {
    if (this.inProgress) {
      this.doFlush();
    }
  }

  stop() {
    console.log(`[${this.name}] tts skipping`);
    // Cancel any pending requests, discard any chunks in our queue, and
    // skip over any audio data already buffered by the audio element.
    this.sourceBuffer?.abort();
    this.chunkBuffer.length = 0;
    this.audio.currentTime = this.audio.buffered.end(0);
    this.inProgress = false;
    this.stopGeneration();
  }
  close() {
    console.log(`[${this.name}] tts stopping`);
    this.audio.pause();
    this.tearDown();
  }

  /**
   * Adds a chunk to the pending chunk buffer, and starts processing the buffer, if possible.
   * The chunk can be a placeholder without any data if the data will be added later;
   * this is useful to ensure chunks are played in the correct order.
   */
  protected queueChunk(chunk: AudioChunk) {
    if (this.inProgress) {
      this.chunkBuffer.push(chunk);
      this.processChunkBuffer();
    } else {
      console.warn(`[${this.name}] chunk received inProgress=false, ignoring`);
    }
  }
  /**
   * Processes the first chunk in the ordered chunk buffer, appending it to the
   * MSE source buffer if possible. If the chunk is pending, no-op.
   */
  protected processChunkBuffer() {
    if (!this.sourceBuffer?.updating && this.chunkBuffer.length > 0 && this.chunkBuffer[0].buffer) {
      const chunk = this.chunkBuffer.shift();
      this.sourceBuffer?.appendBuffer(chunk!.buffer!);
    }
  }
  protected generate(_text: string) {}
  protected doFlush() {}
  protected setComplete() {
    this.inProgress = false;
  }
  protected stopGeneration() {}
  protected tearDown() {
    this.chunkBuffer.length = 0;
    this.inProgress = false;
  }
}

/**
 * A text-to-speech service that requests chunked audio from a server
 * using REST requests for each chunk of audio.
 */
export class RestTextToSpeech extends MseTextToSpeech {
  private pendingText: string = '';
  constructor(
    name: string,
    private readonly urlFunc: BuildUrl,
    private readonly voice: string,
    private readonly rate: number = 1.0
  ) {
    super(name);
  }
  protected generate(text: string) {
    this.pendingText += text;
    let pendingText = '';
    split(this.pendingText).forEach((piece: any) => {
      if (piece.type == 'Sentence') {
        if (piece.children.length == 2 && piece.children[1].type == 'Punctuation') {
          this.requestChunk(piece.raw);
        } else if (!pendingText) {
          pendingText = piece.raw;
        } else {
          console.warn(
            `[${this.name}] found incomplete sentence ${piece.raw} after prior incomplete sentence ${pendingText}`
          );
        }
      }
    });
    this.pendingText = pendingText;
  }
  protected async doFlush() {
    const utterance = this.pendingText.trim();
    this.pendingText = '';
    if (utterance) {
      await this.requestChunk(utterance);
    }
    setTimeout(() => this.setComplete(), 0);
  }
  protected tearDown() {
    this.pendingText = '';
    super.tearDown();
  }
  private async requestChunk(text: string) {
    const newChunk = new AudioChunk();
    this.queueChunk(newChunk);
    console.debug(`[${this.name}] requesting chunk: ${text}`);
    const res = await fetch(this.urlFunc(this.name, this.voice, this.rate, text));
    newChunk.buffer = await res.arrayBuffer();
    console.debug(`[${this.name}] received chunk: ${text}`);
    this.processChunkBuffer();
  }
}

/**
 * Text-to-speech implementation that uses Azure's text-to-speech service.
 */
export class AzureTextToSpeech extends RestTextToSpeech {
  static readonly DEFAULT_VOICE = 'en-US-JennyNeural';
  constructor(urlFunc: BuildUrl, voice: string = AzureTextToSpeech.DEFAULT_VOICE, rate: number = 1.0) {
    super('azure', urlFunc, voice, rate);
  }
}

/**
 * Text-to-speech implementation that uses a web socket to stream text to the
 * server and receives audio chunks as they are generated.
 */
export abstract class WebSocketTextToSpeech extends MseTextToSpeech {
  protected socket: WebSocket;
  private readonly sendBuffer: string[] = [];
  constructor(name: string, private readonly url: string) {
    super(name);
    this.socket = this.createSocket(url);
  }
  protected generate(text: string) {
    this.sendObject(this.createChunkRequest(text));
  }
  protected doFlush() {
    this.sendObject(this.createFlushRequest());
  }
  protected stopGeneration() {
    // Close our socket and create a new one so that we're not blocked by stale generation.
    this.socket.close();
    this.sendBuffer.length = 0;
    this.socket = this.createSocket(this.url);
  }
  protected tearDown() {
    this.socket.close();
    super.tearDown();
  }

  /**
   * Set up a web socket to the given URL, and reconnect if it closes normally
   * so that we're always ready to generate with minimal latency.
   */
  protected createSocket(url: string) {
    const connectMillis = performance.now();
    const socket = new WebSocket(url);
    socket.onopen = (_event) => {
      const elapsed = performance.now() - connectMillis;
      console.log(`[${this.name}] socket opened, elapsed=${elapsed.toFixed(0)}`);
      this.handleOpen();
      this.sendBuffer.forEach((json) => this.socket.send(json));
      this.sendBuffer.length = 0;
    };
    socket.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch (error) {
        console.error(`Failed to parse socket message: ${error}, data=${event.data}`);
        return;
      }
      this.handleMessage(message);
    };
    socket.onerror = (_event) => {
      console.log(`[${this.name}] socket error`);
    };
    socket.onclose = (event) => {
      console.log(`[${this.name}] socket closed, code=${event.code} reason=${event.reason}`);
      if (event.code == 1000) {
        this.socket = this.createSocket(this.socket.url);
      }
    };
    return socket;
  }
  protected sendObject(obj: unknown) {
    const json = JSON.stringify(obj);
    if (this.socket.readyState == WebSocket.OPEN) {
      this.socket.send(json);
    } else {
      this.sendBuffer.push(json);
    }
  }

  protected abstract handleOpen(): void;
  protected abstract handleMessage(_message: unknown): void;
  protected abstract createChunkRequest(_text: string): unknown;
  protected abstract createFlushRequest(): unknown;
}

class ElevenLabsInboundMessage {
  audio?: string;
  isFinal?: boolean;
  message?: string;
  error?: string;
  code?: number;
}
class ElevenLabsOutboundMessage {
  constructor({ text, try_trigger_generation, xi_api_key }: ElevenLabsOutboundMessage) {
    this.text = text;
    this.try_trigger_generation = try_trigger_generation;
    this.xi_api_key = xi_api_key;
  }
  text: string;
  try_trigger_generation?: boolean;
  xi_api_key?: string;
}

/**
 * Text-to-speech implementation that uses Eleven Labs' text-to-speech service.
 */
export class ElevenLabsTextToSpeech extends WebSocketTextToSpeech {
  static readonly DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM';
  constructor(private readonly tokenFunc: GetToken, voice: string = ElevenLabsTextToSpeech.DEFAULT_VOICE) {
    const model_id = 'eleven_monolingual_v1';
    const optimize_streaming_latency = '22';
    const params = new URLSearchParams({ model_id, optimize_streaming_latency });
    const url = `wss://api.elevenlabs.io/v1/text-to-speech/${voice}/stream-input?${params}`;
    super('eleven', url);
  }
  protected async handleOpen() {
    const obj = new ElevenLabsOutboundMessage({ text: ' ', xi_api_key: await this.tokenFunc(this.name) });
    this.sendObject(obj);
  }
  protected handleMessage(inMessage: unknown) {
    const message = inMessage as ElevenLabsInboundMessage;
    console.debug(message);
    if (message.audio) {
      if (!message.isFinal) {
        console.debug(`[${this.name}] chunk received`);
        this.queueChunk(new AudioChunk(Buffer.from(message.audio!, 'base64')));
      } else {
        console.log(`[${this.name}] utterance complete`);
        this.setComplete();
      }
    } else if (message.error) {
      console.error(`[${this.name}] error: ${message.message}`);
    }
  }
  protected createChunkRequest(text: string): ElevenLabsOutboundMessage {
    return new ElevenLabsOutboundMessage({ text: `${text} `, try_trigger_generation: true });
  }
  protected createFlushRequest(): ElevenLabsOutboundMessage {
    return new ElevenLabsOutboundMessage({ text: '' });
  }
}
