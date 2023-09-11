'use client';

/**
 * A function that can be used to build a URL for a text-to-speech
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
    this.cleanUp();
  }
  protected cleanUp() {}
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
    private readonly rate = 1.0
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
  protected generate(_text: string) {}
  protected doFlush() {}
  protected setComplete() {
    this.inProgress = false;
  }
  protected cleanUp() {
    this.chunkBuffer.length = 0;
    this.inProgress = false;
    super.cleanUp();
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
  protected async generate(text: string) {
    this.pendingText += text;
    while (true) {
      // Find the first punctuation mark (period, exclamation point, or question mark)
      // that is not followed by another character (e.g., not the dot in $2.59).
      // We'll send off the resultant sentence for generation, and jump ahead, skipping
      // any spaces after the punctuation.
      const index = this.pendingText.search(/[.!?][^\w]/);
      // If that doesn't work, split on any newlines (e.g., lyrics)
      if (index == -1) {
        break;
      }
      const utterance = this.pendingText.substring(0, index + 1);
      this.pendingText = this.pendingText.substring(index + 2);
      await this.requestChunk(utterance);
      if (!this.pendingText) {
        this.setComplete();
      }
    }
  }
  protected async doFlush() {
    const utterance = this.pendingText;
    this.pendingText = '';
    await this.requestChunk(utterance);
    if (!this.pendingText) {
      this.setComplete();
    }
  }
  protected cleanUp() {
    this.pendingText = '';
    super.cleanUp();
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
  constructor(urlFunc: BuildUrlFunction, voice: string = AzureTextToSpeech.DEFAULT_VOICE, rate: number = 1.0) {
    super('azure', urlFunc, voice, rate);
  }
}

/**
 * Text-to-speech implementation that uses a web socket to stream text to the
 * server and receives audio chunks as they are generated.
 */
export class WebSocketTextToSpeech extends MseTextToSpeech {
  protected socket: WebSocket;
  private pendingText: string = '';
  private pendingFlush: boolean = false;
  constructor(name: string, private readonly url: string) {
    super(name);
    this.socket = this.createSocket(url);
  }
  protected generate(text: string) {
    // Buffer the supplied text if the socket isn't yet open.
    if (this.socket.readyState == WebSocket.OPEN) {
      this.requestChunk(text);
    } else if (this.socket.readyState == WebSocket.CONNECTING) {
      this.pendingText += text;
    }
  }
  protected doFlush() {
    if (this.socket.readyState == WebSocket.OPEN) {
      this.sendFlush();
    } else if (this.socket.readyState == WebSocket.CONNECTING) {
      this.pendingFlush = true;
    }
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
      if (this.pendingText) {
        this.requestChunk(this.pendingText);
        this.pendingText = '';
      }
      if (this.pendingFlush) {
        this.sendFlush();
        this.pendingFlush = false;
      }
    };
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error(`Failed to parse socket message: ${error}`);
      }
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
    this.socket.send(JSON.stringify(obj));
  }
  protected handleOpen() {}
  protected handleMessage(_message: any) {}
  protected requestChunk(_text: string) {}
  protected sendFlush() {}
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
    this.sendObject(obj);
  }
  protected handleMessage(message: any) {
    console.debug(message);
    if (!message.isFinal) {
      console.debug(`[${this.name}] chunk received`);
      this.queueChunk(new AudioChunk(Buffer.from(message.audio, 'base64')));
    } else {
      console.log(`[${this.name}] utterance complete`);
      this.setComplete();
    }
  }
  protected requestChunk(text: string) {
    const obj = {
      text: `${text} `, // text must always end with a space
      try_trigger_generation: true,
    };
    this.sendObject(obj);
  }
  protected sendFlush(): void {
    this.sendObject({ text: '' });
  }
}
