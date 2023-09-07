'use client';

/**
 * Defines a function that can be used to build a URL for a text-to-speech
 * service. This URL will be used to retrieve an audio file that can be
 * played by an HTML5 audio element.
 */
export type BuildUrlFunction = (provider: string, voice: string, rate: number, text: string) => string;

/**
 * Defines a function that can be used to retrieve an ephemeral access token
 * for us with a text-to-speech service. Typically, this will be a
 * fetch request to a server that will return an opaque token.
 */
export type GetTokenFunction = (provider: string) => Promise<string>;

//if (typeof Audio !== 'function') {
//  return;
//}

/**
 * Defines a base class for text-to-speech services. This class provides
 * a common interface for text-to-speech services, as well as some basic
 * infrastructure for playing audio using the HTML5 audio element.
 */
export class TextToSpeechBase {
  protected audio: HTMLAudioElement;
  /**
   * The time when the play() method was first called.
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
  public onEnded?: () => void;

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
    this.audio.onended = () => {
      console.log(`[${this.name}] tts ended`);
      this.onEnded?.();
    };
  }
  /**
   * Converts the given text to speech and plays it using the HTML5 audio element.
   * This method may be called multiple times, and the audio will be played serially.
   * Generation may be buffered, use the flush() method to indicate all text has been provided.
   */
  play(_text: string) {
    throw new Error('Method not implemented.');
  }
  /**
   * Flush any buffered text and play the audio.
   */
  flush() {}
  /**
   * Stop playing any generated audio and discard any buffered text.
   */
  stop() {
    console.log(`[${this.name}] tts stopping`);
    this.audio.pause();
  }
}

/**
 * Defines a text-to-speech service that requests audio from a server and
 * plays it in one shot using the HTML5 audio element. The URL to request
 * audio from the server is constructed using the provided BuildUrlFunction,
 * allowing this class to be used with a variety of text-to-speech services.
 */
export class SimpleTextToSpeech extends TextToSpeechBase {
  constructor(
    name: string,
    protected readonly urlFunc: BuildUrlFunction,
    private readonly voice: string,
    private readonly rate: number = 1.0
  ) {
    super(name);
  }
  play(text: string) {
    this.playMillis = performance.now();
    this.audio.src = this.urlFunc(this.name, this.voice, this.rate, text);
    this.audio.play();
  }
}

class AudioChunk {
  public timestamp: number;
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
 * RestTextToSpeech and ElevenLabsTextToSpeech.
 */
export class MseTextToSpeech extends TextToSpeechBase {
  private readonly mediaSource: MediaSource = new MediaSource();
  private sourceBuffer?: SourceBuffer;
  private readonly chunkBuffer: AudioChunk[] = [];

  constructor(name: string) {
    super(name);
    this.audio.src = URL.createObjectURL(this.mediaSource);
    this.mediaSource.onsourceopen = () => {
      console.log(`[${this.name}] source open`);
      if (!this.sourceBuffer) {
        this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/mpeg');
        this.sourceBuffer.onupdateend = () => {
          console.log(`[${this.name}] source update end`);
          this.processChunkBuffer();
          //this.mediaSource.endOfStream();
        };
      }
    };
    this.mediaSource.onsourceended = () => {
      console.log(`[${this.name}] source ended`); //
    };
    this.mediaSource.onsourceclose = () => {
      console.log(`[${this.name}] source closed`); //
    };
  }
  stop() {
    this.chunkBuffer.length = 0;
    super.stop();
  }
  protected queueChunk(chunk: AudioChunk) {
    this.chunkBuffer.push(chunk);
    this.processChunkBuffer();
  }
  protected processChunkBuffer() {
    if (!this.sourceBuffer?.updating && this.chunkBuffer.length > 0 && this.chunkBuffer[0].buffer) {
      const chunk = this.chunkBuffer.shift();
      this.sourceBuffer?.appendBuffer(chunk!.buffer!);
    }
  }
}

/**
 * Defines a text-to-speech service that requests chunked audio from a server
 * using REST requests for each chunk of audio.
 */
export class RestTextToSpeech extends MseTextToSpeech {
  private pendingText: string = '';
  constructor(
    name: string,
    private readonly urlFunc: BuildUrlFunction,
    private readonly voice: string,
    private readonly rate: number = 1.0
  ) {
    super(name);
  }
  play(text: string) {
    // Reset the clock for any de novo generation.
    if (this.audio.readyState == 0 && !this.pendingText) {
      this.playMillis = performance.now();
      this.audio.play();
    }
    this.pendingText += text;
    // Find first punctuation mark (period, exclamation point, or question mark)
    // that is not followed by another character (e.g., not the dot in $2.59).
    const index = this.pendingText.search(/[.!?][^\w]/);
    if (index >= 0) {
      const sentence = this.pendingText.substring(0, index + 1);
      this.pendingText = this.pendingText.substring(index + 1);
      this.requestChunk(sentence);
    }
  }
  flush() {
    this.requestChunk(this.pendingText);
    this.pendingText = '';
  }
  stop() {
    this.pendingText = '';
    super.stop();
  }
  private async requestChunk(text: string) {
    const newChunk = new AudioChunk();
    this.queueChunk(newChunk);
    console.log(`[${this.name}] requesting chunk: ${text}`);
    const res = await fetch(this.urlFunc(this.name, this.voice, this.rate, text));
    newChunk.buffer = await res.arrayBuffer();
    console.log(`[${this.name}] received chunk: ${text}`);
    this.processChunkBuffer();
  }
}

/**
 * Text-to-speech implementation that uses Azure's text-to-speech service.
 */
export class AzureTextToSpeech extends RestTextToSpeech {
  static readonly DEFAULT_VOICE = 'en-US-JennyNeural';
  constructor(urlFunc: BuildUrlFunction, voice: string = AzureTextToSpeech.DEFAULT_VOICE, rate: number = 1.0) {
    super('azure', urlFunc, voice, rate);
  }
}

/**
 * Text-to-speech implementation that uses a web socket to stream text to the
 * server and receives audio chunks as they are generated.
 */
export class WebSocketTextToSpeech extends MseTextToSpeech {
  protected readonly socket: WebSocket;
  constructor(name: string, private readonly url: string) {
    super(name);
    const connectMillis = performance.now();
    this.socket = new WebSocket(url);
    this.socket.onopen = (_event) => {
      const elapsed = performance.now() - connectMillis;
      console.log(`[${this.name}] socket opened, elapsed=${elapsed.toFixed(0)}`);
      this.handleOpen();
    };
    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error(`Failed to parse socket message: ${error}`);
      }
    };
    this.socket.onerror = (_event) => {
      console.log(`[${this.name}] socket error`);
    };
    this.socket.onclose = (event) => {
      console.log(`[${this.name}] socket closed, code=${event.code} reason=${event.reason}`);
    };
  }
  play(text: string) {
    if (this.audio.readyState == 0) {
      this.playMillis = performance.now();
      this.audio.play();
    }
    this.requestChunk(text);
  }
  close() {
    this.sendClose();
  }
  protected handleOpen() {}
  protected handleMessage(_message: any) {}
  protected requestChunk(_text: string) {}
  protected sendClose() {}
}

/**
 * Text-to-speech implementation that uses Eleven Labs' text-to-speech service.
 */
export class ElevenLabsTextToSpeech extends WebSocketTextToSpeech {
  static readonly DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM';
  constructor(private readonly tokenFunc: GetTokenFunction, voice: string = ElevenLabsTextToSpeech.DEFAULT_VOICE) {
    const model = 'eleven_monolingual_v1';
    const url = `wss://api.elevenlabs.io/v1/text-to-speech/${voice}/stream-input?model_type=${model}`;
    super('eleven', url);
  }
  protected async handleOpen() {
    const obj = {
      xi_api_key: await this.tokenFunc(this.name),
      text: ' ',
    };
    this.socket.send(JSON.stringify(obj));
  }
  protected handleMessage(message: any) {
    console.log(message);
    if (!message.is_final) {
      console.log(`[${this.name}] chunk received`);
      this.queueChunk(new AudioChunk(Buffer.from(message.audio, 'base64')));
    } else {
      console.log(`[${this.name}] final chunk received`);
    }
  }
  protected requestChunk(text: string) {
    const obj = {
      text: `${text} `,
      try_trigger_generation: true,
    };
    this.socket.send(JSON.stringify(obj));
  }
  protected sendClose(): void {
    this.socket.send(JSON.stringify({ text: ' ' }));
  }
}
