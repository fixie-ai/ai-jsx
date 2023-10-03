'use client';
import { split } from 'sentence-splitter';

const AUDIO_WORKLET_SRC = `
class OutputProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.seqNum = 0;
    this.bufPos = 0;
    this.port.onmessage = (e) => {
      this.queue.push(e.data);
      this.queue.sort((a, b) => a.seqNum - b.seqNum);
      console.log('buf added, seq num = ' + e.data.seqNum + ' queue len=' + this.queue.length.toString());
    } 
  }
  process(inputs, outputs) {
    const output = outputs[0];
    const outLeft = output[0];
    const outRight = output[1];
    const outLen = outLeft.length;
    this.copy(outLeft, outRight, outLen);
    return true;
  }
  copy(outLeft, outRight, outLen) {  
    let outPos = 0;
    while (outPos < outLen) {
      const buf = this.buf();
      if (!buf) {
        break;
      }
      const bufLeft = buf[0];
      const bufRight = buf[1] ?? bufLeft;
      const bufLen = bufLeft.length;      
      const len = Math.min(bufLen - this.bufPos, outLen - outPos);
      outLeft.set(bufLeft.subarray(this.bufPos, this.bufPos + len), outPos);
      outRight?.set(bufRight.subarray(this.bufPos, this.bufPos + len), outPos);
      outPos += len;
      this.bufPos += len;      
    }
    if (outPos < outLen) {
      //console.warn('buf exhausted, out pos=' + outPos.toString());
      outLeft.fill(0, outPos);
      outRight?.fill(0, outPos);
      outPos = outLen;
    }
  }
  buf() {
    const msg = this.queue[0];
    if (!msg || msg.seqNum != this.seqNum) {
      if (msg) {
        console.log('buf not ready, msg seq num=' + msg?.seqNum.toString());
      }
      return null;
    }
    if (this.bufPos == msg.channelData[0].length) {
      this.port.postMessage({seqNum: msg.seqNum});
      this.queue.shift();
      console.log('buf consumed, seq num=' + msg.seqNum.toString() + ' queue len=' + this.queue.length.toString());
      this.seqNum++;
      this.bufPos = 0;
      return this.buf();
    }
    return msg.channelData;
  }
}

registerProcessor("output-processor", OutputProcessor);
`;

class AudioMessage {
  constructor(public seqNum: number, public channelData: Float32Array[]) {}
}
class AudioOutputManager {
  private context?: AudioContext;
  private outputNode?: AudioWorkletNode;
  private seqNum = 0;
  async createStream() {
    if (!this.context) {
      this.context = new AudioContext({ sampleRate: 44100 });
      const workletSrcBlob = new Blob([AUDIO_WORKLET_SRC], {
        type: 'application/javascript',
      });
      const workletSrcUrl = URL.createObjectURL(workletSrcBlob);
      await this.context.audioWorklet.addModule(workletSrcUrl);
      this.outputNode = new AudioWorkletNode(this.context, 'output-processor');
      this.outputNode.port.onmessage = (e) => {
        console.log(`buf consumed, seq num=${e.data.seqNum}`);
      };
    }
    const dest = this.context.createMediaStreamDestination();
    this.outputNode!.connect(dest);
    return dest.stream;
  }
  async appendBuffer(encodedBuffer: ArrayBuffer) {
    const seqNum = this.seqNum++;
    let buffer;
    for (let i = 0; i < 1; i++) {
      try {
        console.log(`decoding buffer, elen=${encodedBuffer.byteLength}`);
        buffer = await this.context?.decodeAudioData(encodedBuffer);
        console.log(`decoded buffer, dlen=${buffer!.length}`);
      } catch (error) {
        console.warn(`decode error: ${error}`);
        continue;
      }
    }

    const channelData = [buffer!.getChannelData(0)];
    if (buffer!.numberOfChannels > 1) {
      channelData.push(buffer!.getChannelData(1));
    }
    console.log(`buf added, seq num=${seqNum}`);
    this.outputNode?.port.postMessage(new AudioMessage(seqNum, channelData));
  }
}

const outputManager = new AudioOutputManager();

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
  protected playing = false;

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
  /**
   * Called when an error occurs.
   */
  public onError?: (error: Error) => void;

  constructor(protected readonly name: string) {
    this.audio = new Audio();
    this.audio.onplay = () => console.log(`[${this.name}] tts playing`);
    this.audio.onpause = () => console.log(`[${this.name}] tts paused`);
    this.audio.onloadstart = () => console.log(`[${this.name}] tts loadstart`);
    this.audio.onloadeddata = () => console.log(`[${this.name}] tts loadeddata`);
    this.audio.oncanplay = () => console.log(`[${this.name}] tts canplay`);
  }
  protected setPlaying() {
    console.log(`[${this.name}] tts playing`);
    if (this.playMillis) {
      this.latency = Math.floor(performance.now() - this.playMillis);
      console.log(`[${this.name}] tts play latency: ${this.latency} ms`);
    }
    this.playing = true;
    this.onPlaying?.();
  }
  protected setComplete(error?: Error) {
    console.log(`[${this.name}] tts complete`);
    this.playing = false;
    if (error) {
      this.onError?.(error);
    } else {
      this.onComplete?.();
    }
  }

  /**
   * Whether audio is currently playing.
   */
  get isPlaying(): boolean {
    return this.playing;
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
 * audio from the server is constructed using the provided BuildUrl function,
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
    this.audio.onplaying = () => this.setPlaying();
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

export class WebAudioTextToSpeech extends TextToSpeechBase {
  //private readonly audioContext: AudioContext;
  //private readonly destNode: MediaStreamAudioDestinationNode;
  private readonly chunkBuffer: ArrayBuffer[] = [];
  //private readonly sourceNodes: AudioBufferSourceNode[] = [];
  private audioOutputNode?: AudioWorkletNode;
  private updating = false;
  private nextStartTime: number = 0;
  private inProgress = false;
  constructor(name: string) {//}, context: AudioContext) {
    super(name);
    //this.audioContext = context;
    //this.destNode = this.audioContext.createMediaStreamDestination();
    this.audio.onwaiting = () => console.log(`[${this.name}] tts waiting`);
  }
  async play(text: string) {
    //++++
    if (!this.inProgress) {
      this.playMillis = performance.now();
      this.inProgress = true;
    }
    if (this.audio.readyState == 0) {
      console.log(`[${this.name}] tts starting play`);
      //this.audioOutputNode = new AudioWorkletNode(getAudioContext()!, 'output-processor');
      //this.audioOutputNode.connect(this.destNode);
      this.audio.srcObject = await outputManager.createStream();
      this.audio.play();
    }
  
    this.generate(text);
  }
  flush() {
    if (this.inProgress) {
      this.doFlush();
      this.inProgress = false;
    }
  }

  stop() {
    console.log(`[${this.name}] tts skipping`);
    // Cancel any pending requests, discard any chunks in our queue, and
    // skip over any audio data already buffered by the audio element.
    //while (this.sourceNodes.length > 0) {
    //  this.sourceNodes.pop()!.stop();
    //}
    this.audio.currentTime = this.nextStartTime;
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
  protected queueChunk(chunk: ArrayBuffer) {
    this.chunkBuffer.push(chunk);
    this.processChunkQueue();
  }

  /**
   * Processes the first chunk in the ordered chunk buffer, creating a new source node
   * and connecting it to the destination node. If the chunk is pending, no-op.
   */
  /*protected async processChunkQueue() {
    if (!this.updating && this.chunkBuffer.length > 0) {
      this.updating = true;
      const chunk = this.chunkBuffer.shift()!;
      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.onended = () => {
        const index = this.sourceNodes.indexOf(sourceNode);
        console.log(`[${this.name}] chunk ended, curr time=${this.audioContext.currentTime} pos=${index}`);
        this.sourceNodes.splice(index, 1);
        // When cleaning up, we need to disconnect the destination node from the graph, otherwise
        // time will crank forward and we'll get dilation of the next queued audio chunks, as noted in
        // https://bugs.chromium.org/p/chromium/issues/detail?id=638823#c31
        if (this.sourceNodes.length == 0 && !this.inProgress) {
          this.audio.srcObject = null;
          this.setComplete();
        }
      };
      console.log(`[${this.name}] decoding chunk`);
      sourceNode.buffer = await this.audioContext.decodeAudioData(chunk);
      // Once we start playing, currentTime will continuously increase, so we need to
      // handle the situation where this.nextStartTime is stale.
      this.nextStartTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
      console.log(
        `[${this.name}] sequencing chunk with start time ${this.nextStartTime}, curr time=${this.audioContext.currentTime}`
      );
      sourceNode.connect(this.destNode);
      sourceNode.start(this.nextStartTime);
      this.sourceNodes.push(sourceNode);
      this.nextStartTime += sourceNode.buffer.duration;
      this.updating = false;
      if (!this.playing) {
        this.setPlaying();
      }
      setTimeout(() => this.processChunkQueue(), 0);
    }
  }*/

  protected async processChunkQueue() {
    if (!this.updating && this.chunkBuffer.length > 0) {
      this.updating = true;
      const chunk = this.chunkBuffer.shift()!;
      console.log(`[${this.name}] decoding chunk`);
      outputManager.appendBuffer(chunk);
      //const buffer = await this.audioContext.decodeAudioData(chunk);
      //console.log(`[${this.name}] decoded chunk, sample rate=${buffer.sampleRate}`);
      //postAudioBuffer(this.audioOutputNode!, buffer);
      this.updating = false;
      if (!this.playing) {
        this.setPlaying();
      }
      setTimeout(() => this.processChunkQueue(), 0);
    }
  }

  protected generate(_text: string) {}
  protected doFlush() {}
  protected stopGeneration() {}
  protected tearDown() {
    this.chunkBuffer.length = 0;
    this.inProgress = false;
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
  private readonly chunkQueue: ArrayBuffer[] = [];
  private inProgress = false;

  constructor(name: string) {
    super(name);
    this.audio.src = URL.createObjectURL(this.mediaSource);
    this.audio.onplaying = () => {
      console.log(`[${this.name}] tts playing`);
      this.setPlaying();
    };
    this.audio.onwaiting = () => {
      console.log(`[${this.name}] tts waiting`);
      if (!this.inProgress) {
        this.setComplete();
      }
    };
    this.mediaSource.onsourceopen = () => {
      if (!this.sourceBuffer) {
        this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/mpeg');
        this.sourceBuffer.onupdateend = () => {
          this.processChunkQueue();
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
    this.chunkQueue.length = 0;
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
  protected queueChunk(chunk: ArrayBuffer) {
    this.chunkQueue.push(chunk);
    this.processChunkQueue();
  }

  /**
   * Processes the first chunk in the ordered chunk buffer, appending it to the
   * MSE source buffer if possible. If the chunk is pending, no-op.
   */
  protected processChunkQueue() {
    if (!this.sourceBuffer?.updating && this.chunkQueue.length > 0) {
      this.sourceBuffer?.appendBuffer(this.chunkQueue.shift()!);
    }
  }
  protected generate(_text: string) {}
  protected doFlush() {}
  protected stopGeneration() {}
  protected tearDown() {
    this.chunkQueue.length = 0;
    this.inProgress = false;
  }
}

class TextToSpeechRequest {
  public readonly createTimestamp: number;
  public sendTimestamp?: number;
  constructor(public text: string) {
    this.createTimestamp = performance.now();
  }
}

/**
 * A text-to-speech service that requests chunked audio from a server
 * using REST requests for each chunk of audio.
 */
export class RestTextToSpeech extends WebAudioTextToSpeech {
  private pendingText: string = '';
  private readonly requestQueue: TextToSpeechRequest[] = [];
  constructor(
    name: string,
    private readonly urlFunc: BuildUrl,
    private readonly voice: string,
    private readonly rate: number = 1.0
  ) {
    super(name);// getAudioContext()!);
  }
  protected generate(text: string) {
    // Only send complete sentences to the server, one at a time.
    // We only know if a sentence is complete if a sentence fragment comes
    // after it (e.g., the sentence length is less thatn the total pending text
    // length).
    this.pendingText += text;
    let pendingText = '';
    for (const piece of split(this.pendingText)) {
      if (piece.type == 'Sentence') {
        if (piece.range[1] < this.pendingText.length) {
          this.queueRequest(piece.raw);
        } else if (!pendingText) {
          pendingText = piece.raw;
        } else {
          console.warn(
            `[${this.name}] found incomplete sentence ${piece.raw} after prior incomplete sentence ${pendingText}`
          );
        }
      }
    }
    this.pendingText = pendingText;
  }
  protected async doFlush() {
    const utterance = this.pendingText.trim();
    this.pendingText = '';
    if (utterance) {
      await this.queueRequest(utterance);
    }
  }
  protected tearDown() {
    this.pendingText = '';
    super.tearDown();
  }
  private queueRequest(text: string) {
    this.requestQueue.push(new TextToSpeechRequest(text));
    this.processRequestBuffer();
  }
  private async processRequestBuffer() {
    // Serialize the generate requests to ensure that the first request
    // is not delayed by subsequent requests.
    if (this.requestQueue.length == 0 || this.requestQueue[0].sendTimestamp) {
      return;
    }

    const req = this.requestQueue[0];
    const shortText = req.text.length > 20 ? `${req.text.substring(0, 20)}...` : req.text;
    console.debug(`[${this.name}] requesting chunk: ${shortText}`);
    req.sendTimestamp = performance.now();
    const res = await fetch(this.urlFunc(this.name, this.voice, this.rate, req.text));
    if (!res.ok) {
      this.stop();
      this.setComplete(new Error(`[${this.name}] generation request failed: ${res.status} ${res.statusText}`));
      return;
    }

    const chunk = await res.arrayBuffer();
    console.debug(`[${this.name}] received chunk: ${shortText}, type=${res.headers.get('content-type')}`);
    this.queueChunk(chunk);
    this.requestQueue.shift();
    this.processRequestBuffer();
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
 * Text-to-speech implementation that uses the AWS Polly text-to-speech service.
 */
export class AwsTextToSpeech extends RestTextToSpeech {
  static readonly DEFAULT_VOICE = 'Joanna';
  constructor(urlFunc: BuildUrl, voice: string = AwsTextToSpeech.DEFAULT_VOICE, rate: number = 1.0) {
    super('aws', urlFunc, voice, rate);
  }
}

/**
 * Text-to-speech implementation that uses the Google Cloud text-to-speech service.
 */
export class GcpTextToSpeech extends RestTextToSpeech {
  static readonly DEFAULT_VOICE = 'en-US-Neural2-C';
  constructor(urlFunc: BuildUrl, voice: string = GcpTextToSpeech.DEFAULT_VOICE, rate: number = 1.0) {
    super('gcp', urlFunc, voice, rate);
  }
}

/**
 * Text-to-speech implementation that uses the WellSaid Labs text-to-speech service.
 */
export class WellSaidTextToSpeech extends RestTextToSpeech {
  static readonly DEFAULT_VOICE = '42'; // Sofia H. (Conversational)
  constructor(urlFunc: BuildUrl, voice: string = WellSaidTextToSpeech.DEFAULT_VOICE, rate: number = 1.0) {
    super('wellsaid', urlFunc, voice, rate);
  }
}

export class MurfTextToSpeech extends RestTextToSpeech {
  static readonly DEFAULT_VOICE = 'en-US-natalie';
  constructor(urlFunc: BuildUrl, voice: string = MurfTextToSpeech.DEFAULT_VOICE, rate: number = 1.0) {
    super('murf', urlFunc, voice, rate);
  }
}

/**
 * Text-to-speech implementation that uses the Play.HT text-to-speech service.
 */
export class PlayHTTextToSpeech extends RestTextToSpeech {
  static readonly DEFAULT_VOICE = 'victor'; // AKA 'Ariana'
  constructor(urlFunc: BuildUrl, voice: string = PlayHTTextToSpeech.DEFAULT_VOICE, rate: number = 1.0) {
    super('playht', urlFunc, voice, rate);
  }
}

/**
 * Text-to-speech implementation that uses the Resemble.AI text-to-speech service.
 */
export class ResembleTextToSpeech extends RestTextToSpeech {
  static readonly DEFAULT_VOICE = '48d7ed16'; // Tarkos
  constructor(urlFunc: BuildUrl, voice: string = ResembleTextToSpeech.DEFAULT_VOICE, rate: number = 1.0) {
    super('resemble', urlFunc, voice, rate);
  }
}

/**
 * Text-to-speech implementation that uses the Resemble.AI text-to-speech service.
 */
export class ElevenLabsTextToSpeech extends RestTextToSpeech {
  static readonly DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM';
  constructor(urlFunc: BuildUrl, voice: string = ElevenLabsTextToSpeech.DEFAULT_VOICE, rate: number = 1.0) {
    super('eleven', urlFunc, voice, rate);
  }
}

/**
 * Text-to-speech implementation that uses a web socket to stream text to the
 * server and receives audio chunks as they are generated.
 */
export abstract class WebSocketTextToSpeech extends WebAudioTextToSpeech {
  protected socket: WebSocket;
  // Message buffer for when the socket is not yet open.
  private readonly socketBuffer: string[] = [];
  private pendingText: string = '';
  constructor(name: string, private readonly url: string) {
    super(name);//, getAudioContext()!);
    this.socket = this.createSocket(url);
  }
  protected generate(text: string) {
    // Only send complete words (i.e., followed by a space) to the server.
    this.pendingText += text;
    const index = this.pendingText.lastIndexOf(' ');
    if (index == -1) {
      return;
    }

    const completeText = this.pendingText.substring(0, index);
    this.sendObject(this.createChunkRequest(completeText));
    this.pendingText = this.pendingText.substring(index + 1);
  }
  protected doFlush() {
    console.log(`[${this.name}] flushing`); 
    // Flush any pending text (all generation requests have to be followed by a space),
    // and send a flush request to the server.
    if (this.pendingText) {
      this.sendObject(this.createChunkRequest(`${this.pendingText} `));
    }
    this.sendObject(this.createFlushRequest());
    this.pendingText = '';
  }
  protected stopGeneration() {
    // Close our socket and create a new one so that we're not blocked by stale generation.
    this.socket.close();
    this.socketBuffer.length = 0;
    this.pendingText = '';
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
      this.socketBuffer.forEach((json) => this.socket.send(json));
      this.socketBuffer.length = 0;
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
      // Reopen the socket if it closed normally, i.e., not due to an error.
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
      this.socketBuffer.push(json);
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
  constructor({ text, try_trigger_generation, generation_config, xi_api_key }: ElevenLabsOutboundMessage) {
    this.text = text;
    this.try_trigger_generation = try_trigger_generation;
    this.generation_config = generation_config;
    this.xi_api_key = xi_api_key;
  }
  text: string;
  voice_settings?: {
    stability: number;
    similarity: number;
  };
  generation_config?: {
    chunk_length_schedule: number[];
  };
  try_trigger_generation?: boolean;
  xi_api_key?: string;
}

/**
 * Text-to-speech implementation that uses Eleven Labs' text-to-speech service.
 */
export class ElevenLabsWebSocketTextToSpeech extends WebSocketTextToSpeech {
  constructor(private readonly tokenFunc: GetToken, voice: string = ElevenLabsTextToSpeech.DEFAULT_VOICE) {
    const model_id = 'eleven_monolingual_v1';
    const optimize_streaming_latency = '22'; // doesn't seem to have any effect
    const params = new URLSearchParams({ model_id, optimize_streaming_latency });
    const url = `wss://api.elevenlabs.io/v1/text-to-speech/${voice}/stream-input?${params}`;
    super('eleven', url);
  }
  protected async handleOpen() {
    // A chunk_length_schedule of [50] means we'll try to generate a chunk
    // once we have 50 characters of text buffered.
    const obj = new ElevenLabsOutboundMessage({
      text: ' ',
      voice_settings: {
        stability: 0.5,
        similarity: 0.8,
      },
      generation_config: {
        chunk_length_schedule: [50],
      },
      xi_api_key: await this.tokenFunc(this.name),
    });
    this.sendObject(obj);
  }
  protected handleMessage(inMessage: unknown) {
    const message = inMessage as ElevenLabsInboundMessage;
    console.debug(message);
    if (message.audio) {
      console.debug(`[${this.name}] chunk received`);
      this.queueChunk(Buffer.from(message.audio!, 'base64').buffer);
    } else if (message.isFinal) {
      console.log(`[${this.name}] utterance complete`);
      this.setComplete();
    } else if (message.error) {
      console.error(`[${this.name}] error: ${message.message}`);
    }
  }
  protected createChunkRequest(text: string): ElevenLabsOutboundMessage {
    // try_trigger_generation tries to force generation of chunks as soon as possible.
    return new ElevenLabsOutboundMessage({ text: `${text} `, try_trigger_generation: true });
  }
  protected createFlushRequest(): ElevenLabsOutboundMessage {
    return new ElevenLabsOutboundMessage({ text: '' });
  }
}

export type TextToSpeechProtocol = 'rest' | 'ws';

export class TextToSpeechOptions {
  proto?: TextToSpeechProtocol;
  rate?: number;
  voice?: string;
  getToken?: GetToken;
  buildUrl?: BuildUrl;
  constructor(public provider: string) {}
}

/**
 * Factory function to create a text-to-speech service for the specified provider.
 */
export function createTextToSpeech({ provider, proto, rate, voice, getToken, buildUrl }: TextToSpeechOptions) {
  if (!proto || proto == 'rest') {
    switch (provider) {
      case 'azure':
        return new AzureTextToSpeech(buildUrl!, voice, rate);
      case 'aws':
        return new AwsTextToSpeech(buildUrl!, voice, rate);
      case 'gcp':
        return new GcpTextToSpeech(buildUrl!, voice, rate);
      case 'wellsaid':
        return new WellSaidTextToSpeech(buildUrl!, voice, rate);
      case 'murf':
        return new MurfTextToSpeech(buildUrl!, voice, rate);
      case 'playht':
        return new PlayHTTextToSpeech(buildUrl!, voice, rate);
      case 'resemble':
        return new ResembleTextToSpeech(buildUrl!, voice, rate);
      case 'eleven':
        return new ElevenLabsTextToSpeech(buildUrl!, voice);
      default:
        throw new Error(`unknown REST provider ${provider}`);
    }
  } else {
    switch (provider) {
      case 'eleven':
        return new ElevenLabsWebSocketTextToSpeech(getToken!, voice);
      default:
        throw new Error(`unknown WebSocket provider ${provider}`);
    }
  }
}
