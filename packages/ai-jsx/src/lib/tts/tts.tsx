'use client';
import { split } from 'sentence-splitter';

const AUDIO_WORKLET_SRC = `
class OutputProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.msgs = {};
    this.seqNum = 0;
    this.bufPos = 0;
    this.port.onmessage = (e) => {
      this.msgs[e.data.seqNum] = e.data;
      //console.debug('buf added, seq num = ' + e.data.seqNum + ' queue len=' + this.queue.length.toString());
    } 
  }
  process(inputs, outputs) {
    const [[outLeft, outRight]] = outputs;
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
    const msg = this.msgs[this.seqNum];
    if (!msg) {
      return null;
    }
    if (this.bufPos == msg.channelData[0].length) {
      this.port.postMessage({seqNum: msg.seqNum});
      delete this.msgs[msg.seqNum];
      //console.debug('buf consumed, seq num=' + msg.seqNum.toString() + ' queue len=' + this.queue.length.toString());
      this.seqNum++;
      this.bufPos = 0;
      return this.buf();
    }
    return msg.channelData;
  }
}

registerProcessor("output-processor", OutputProcessor);
`;

const AUDIO_MPEG_MIME_TYPE = 'audio/mpeg';
const AUDIO_PCM_MIME_TYPE = 'audio/pcm';
const AUDIO_L16_MIME_TYPE = 'audio/L16';

/**
 * A chunk of encoded or raw audio data; the encoding is specified by `mimeType`.
 * If the encoding is PCM, the sample rate must be specified in `sampleRate`.
 * PCM data is assumed to be signed 16-bit little-endian.
 */
class AudioChunk {
  mimeType: string;
  sampleRate: number;
  constructor(contentType: string, public buffer: ArrayBuffer) {
    const pieces = contentType.split(';');
    this.mimeType = pieces[0];
    const sampleRatePiece = pieces.find((piece) => piece.trim().startsWith('rate='));
    this.sampleRate = sampleRatePiece ? parseInt(sampleRatePiece.split('=')[1]) : 0;
  }
  get isPcm() {
    return this.mimeType == AUDIO_PCM_MIME_TYPE || this.mimeType == AUDIO_L16_MIME_TYPE;
  }
}

/**
 * An internal object used to manage an active audio stream.
 */
class AudioStream {
  nextSeqNum = 0;
  constructor(
    public outputNode: AudioWorkletNode,
    public destNode: MediaStreamAudioDestinationNode,
    public analyzerNode?: AnalyserNode
  ) {}
}

/**
 * Manages an AudioContext and allows creation of multiple audio streams
 * that can be played out using <audio> elements. Use of <audio> for
 * playout avoids some of the problems associated with using WebAudio
 * directly, e.g., audio not playing on iOS when the phone is on silent.
 */
class AudioOutputManager extends EventTarget {
  private context?: AudioContext;
  private readonly streams: Map<string, AudioStream> = new Map<string, AudioStream>();
  async start() {
    if (this.context || typeof AudioContext == 'undefined') {
      return;
    }
    this.context = new AudioContext();
    const workletSrcBlob = new Blob([AUDIO_WORKLET_SRC], {
      type: 'application/javascript',
    });
    const workletSrcUrl = URL.createObjectURL(workletSrcBlob);
    await this.context.audioWorklet.addModule(workletSrcUrl);
  }
  stop() {
    this.context?.close();
    this.context = undefined;
  }
  createStream(wantAnalyzer = true) {
    if (!this.context) {
      throw new Error('AudioOutputManager not started');
    }

    this.context.resume();
    const outputNode = new AudioWorkletNode(this.context, 'output-processor');
    const destNode = this.context.createMediaStreamDestination();
    const streamId = destNode.stream.id;
    let analyzerNode;
    if (wantAnalyzer) {
      analyzerNode = this.context.createAnalyser();
      outputNode.connect(analyzerNode).connect(destNode);
    } else {
      outputNode.connect(destNode);
    }
    outputNode.port.onmessage = (e) => {
      this.handleBufferProcessed(streamId, e.data.seqNum);
    };
    this.streams.set(streamId, new AudioStream(outputNode, destNode, analyzerNode));
    return destNode.stream;
  }
  destroyStream(streamId: string) {
    const audioStream = this.streams.get(streamId);
    if (!audioStream) {
      return;
    }
    audioStream.outputNode.port.onmessage = null;
    audioStream.outputNode.disconnect();
    this.streams.delete(streamId);
  }
  getAnalyzer(streamId: string) {
    const audioStream = this.streams.get(streamId);
    if (!audioStream) {
      return;
    }
    return audioStream.analyzerNode;
  }
  async appendBuffer(streamId: string, chunk: AudioChunk) {
    if (chunk.isPcm) {
      await this.appendPcmBuffer(streamId, chunk.sampleRate, chunk.buffer);
    } else {
      await this.appendEncodedBuffer(streamId, chunk.buffer);
    }
  }
  private async appendEncodedBuffer(streamId: string, encodedBuffer: ArrayBuffer) {
    const seqNum = this.getNextSeqNum(streamId);
    const buffer = await this.context?.decodeAudioData(encodedBuffer);
    this.appendNativeBuffer(streamId, seqNum, buffer!.getChannelData(0));
  }
  private async appendPcmBuffer(streamId: string, sampleRate: number, inBuffer: ArrayBuffer) {
    const seqNum = this.getNextSeqNum(streamId);
    const buffer = await this.resamplePcmBuffer(sampleRate, inBuffer);
    this.appendNativeBuffer(streamId, seqNum, buffer);
  }
  private getNextSeqNum(streamId: string) {
    const audioStream = this.streams.get(streamId);
    if (!audioStream) {
      throw new Error('stream not found');
    }
    return audioStream.nextSeqNum++;
  }
  private async resamplePcmBuffer(inSampleRate: number, inBuffer: ArrayBuffer) {
    const floatBuffer = this.makeAudioBuffer(inBuffer);
    if (inSampleRate == this.context!.sampleRate) {
      return floatBuffer;
    }
    const outSamples = Math.floor((floatBuffer.length * this.context!.sampleRate) / inSampleRate);
    const offlineContext = new OfflineAudioContext({
      sampleRate: this.context!.sampleRate,
      numberOfChannels: 1,
      length: outSamples,
    });
    const source = offlineContext.createBufferSource();
    source.buffer = new AudioBuffer({ sampleRate: inSampleRate, length: floatBuffer.length, numberOfChannels: 1 });
    source.buffer.copyToChannel(this.makeAudioBuffer(inBuffer), 0);
    source.connect(offlineContext.destination);
    source.start(0);
    const outBuffer = await offlineContext.startRendering();
    return outBuffer.getChannelData(0);
  }
  private makeAudioBuffer(inBuffer: ArrayBuffer) {
    const view = new Int16Array(inBuffer);
    const outBuffer = new Float32Array(view.length);
    view.forEach((sample, index) => {
      outBuffer[index] = sample / 32768;
    });
    return outBuffer;
  }
  private appendNativeBuffer(streamId: string, seqNum: number, buffer: Float32Array) {
    const audioStream = this.streams.get(streamId);
    if (!audioStream) {
      return;
    }
    const channelData = [buffer];
    console.log(`buf added, seq num=${seqNum}`);
    audioStream.outputNode.port.postMessage({ seqNum, channelData });
  }
  private handleBufferProcessed(streamId: string, seqNum: number) {
    const audioStream = this.streams.get(streamId);
    if (!audioStream) {
      return;
    }
    console.log(`buf consumed, seq num=${seqNum}`);
    if (audioStream.nextSeqNum == seqNum + 1) {
      this.dispatchEvent(new CustomEvent('waiting', { detail: streamId }));
    }
  }
}

const outputManager = new AudioOutputManager();
outputManager.start();

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
    public readonly voice: string,
    public readonly rate = 1.0
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

/**
 * Defines a text-to-speech service that requests individual audio utterances
 * from a server and plays them out using Web Audio and <audio> elements.
 * This approach reduces latency by allowing the audio to be streamed as it is
 * generated, rather than waiting for the entire audio file to be generated. It also
 * allows text to be fed to the service in a stream rather than all at once. This
 * class is not meant to be used directly, but provides infrastructure for
 * RestTextToSpeech and WebSocketTextToSpeech.
 */
export class WebAudioTextToSpeech extends TextToSpeechBase {
  private readonly chunkBuffer: AudioChunk[] = [];
  private streamId: string = '';
  private updating = false;
  private inProgress = false;
  constructor(name: string) {
    super(name);
    this.audio.onwaiting = () => console.log(`[${this.name}] tts waiting`);
  }
  play(text: string) {
    if (this.audio.readyState == 0) {
      console.log(`[${this.name}] tts starting play`);
      this.audio.srcObject = outputManager.createStream();
      this.streamId = this.audio.srcObject.id;
      outputManager.addEventListener('waiting', (event: CustomEventInit<string>) => {
        if (event.detail == this.streamId) {
          this.setComplete();
        }
      });
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
      this.inProgress = false;
    }
  }

  stop() {
    console.log(`[${this.name}] tts skipping`);
    // Cancel any pending requests, discard any chunks in our queue, and
    // reset our audio element.
    outputManager.destroyStream(this.streamId!);
    this.streamId = '';
    this.chunkBuffer.length = 0;
    this.audio.srcObject = null;
    this.audio.currentTime = 0;
    this.inProgress = false;
    this.stopGeneration();
  }
  close() {
    console.log(`[${this.name}] tts stopping`);
    this.audio.pause();
    this.tearDown();
  }

  get analyzer() {
    return outputManager.getAnalyzer(this.streamId);
  }

  /**
   * Adds a chunk to the pending chunk buffer, and starts processing the buffer, if possible.
   * The chunk can be a placeholder without any data if the data will be added later;
   * this is useful to ensure chunks are played in the correct order.
   */
  protected queueChunk(chunk: AudioChunk) {
    this.chunkBuffer.push(chunk);
    this.processChunkQueue();
  }

  /**
   * Processes the first chunk in the ordered chunk buffer, creating a new source node
   * and connecting it to the destination node. If the chunk is pending, no-op.
   */
  protected async processChunkQueue() {
    if (!this.updating && this.chunkBuffer.length > 0) {
      this.updating = true;
      const chunk = this.chunkBuffer.shift()!;
      console.log(`[${this.name}] decoding chunk`);
      await outputManager.appendBuffer(this.streamId, chunk);
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    public readonly voice: string,
    public readonly rate: number = 1.0
  ) {
    super(name);
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
    this.processRequestQueue();
  }
  private async processRequestQueue() {
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

    const contentType = res.headers.get('content-type') ?? AUDIO_MPEG_MIME_TYPE;
    const chunk = new AudioChunk(contentType, await res.arrayBuffer());
    console.debug(`[${this.name}] received chunk: ${shortText}, type=${res.headers.get('content-type')}`);
    this.queueChunk(chunk);
    this.requestQueue.shift();
    this.processRequestQueue();
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
 * Text-to-speech implementation that uses Azure's text-to-speech service.
 */
export class AzureTextToSpeech extends RestTextToSpeech {
  static readonly DEFAULT_VOICE = 'en-US-JennyNeural';
  constructor(urlFunc: BuildUrl, voice: string = AzureTextToSpeech.DEFAULT_VOICE, rate: number = 1.0) {
    super('azure', urlFunc, voice, rate);
  }
}

/**
 * Text-to-speech implementation that uses the ElevenLabs text-to-speech service.
 */
export class ElevenLabsTextToSpeech extends RestTextToSpeech {
  static readonly DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM';
  static readonly DEFAULT_MODEL = 'eleven_monolingual_v1';
  constructor(urlFunc: BuildUrl, voice: string = ElevenLabsTextToSpeech.DEFAULT_VOICE, rate: number = 1.0) {
    super('eleven', urlFunc, voice, rate, model);
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

export class LmntTextToSpeech extends RestTextToSpeech {
  static readonly DEFAULT_VOICE = 'mrnmrz72'; // Marzia
  constructor(urlFunc: BuildUrl, voice: string = LmntTextToSpeech.DEFAULT_VOICE, rate: number = 1.0) {
    super('lmnt', urlFunc, voice, rate);
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
  // static readonly DEFAULT_VOICE = 'victor'; // AKA 'Ariana'
  static readonly DEFAULT_VOICE =
    's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json';
  constructor(urlFunc: BuildUrl, voice: string = PlayHTTextToSpeech.DEFAULT_VOICE, rate: number = 1.0) {
    super('playht', urlFunc, voice, rate);
  }
}

/**
 * Text-to-speech implementation that uses the Resemble.AI text-to-speech service.
 */
export class ResembleTextToSpeech extends RestTextToSpeech {
  static readonly DEFAULT_VOICE = 'e28236ee'; // Samantha (v2)
  constructor(urlFunc: BuildUrl, voice: string = ResembleTextToSpeech.DEFAULT_VOICE, rate: number = 1.0) {
    super('resemble', urlFunc, voice, rate);
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

/**
 * Text-to-speech implementation that uses a web socket to stream text to the
 * server and receives audio chunks as they are generated.
 */
export abstract class WebSocketTextToSpeech extends WebAudioTextToSpeech {
  private socket: WebSocket;
  private socketReady: boolean;
  // Message buffer for when the socket is not yet open.
  private readonly socketBuffer: string[] = [];
  private pendingText: string = '';
  constructor(name: string, private readonly url: string, public readonly voice: string) {
    super(name);
    this.socket = this.createSocket(url);
    this.socketReady = false;
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
    this.socketReady = false;
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
    socket.binaryType = 'arraybuffer';
    socket.onopen = async (_event) => {
      const elapsed = performance.now() - connectMillis;
      console.log(`[${this.name}] socket opened, elapsed=${elapsed.toFixed(0)}`);
      const openMsg = await this.createOpenRequest();
      if (openMsg) {
        this.socketBuffer.unshift(JSON.stringify(openMsg));
      }
      this.socketBuffer.forEach((json) => this.socket.send(json));
      this.socketBuffer.length = 0;
      this.socketReady = true;
    };
    socket.onmessage = (event) => {
      let message;
      if (typeof event.data == 'string') {
        try {
          message = JSON.parse(event.data);
        } catch (error) {
          console.error(`Failed to parse socket message: ${error}, data=${event.data}`);
          return;
        }
        this.handleMessage(message);
      } else if (event.data instanceof ArrayBuffer) {
        this.queueChunk(new AudioChunk(AUDIO_MPEG_MIME_TYPE, event.data));
      }
    };
    socket.onerror = (_event) => {
      console.log(`[${this.name}] socket error`);
    };
    socket.onclose = (event) => {
      // Reopen the socket if it closed normally, i.e., not due to an error.
      console.log(`[${this.name}] socket closed, code=${event.code} reason=${event.reason}`);
      if (event.code == 1000) {
        this.socket = this.createSocket(this.socket.url);
        this.socketReady = false;
      }
    };
    return socket;
  }
  protected sendObject(obj: unknown) {
    const json = JSON.stringify(obj);
    if (this.socketReady) {
      this.socket.send(json);
    } else {
      this.socketBuffer.push(json);
    }
  }

  protected handleMessage(_message: unknown) {}
  protected abstract createOpenRequest(): unknown;
  protected abstract createChunkRequest(_text: string): unknown;
  protected abstract createFlushRequest(): unknown;
}

interface ElevenLabsInboundMessage {
  audio?: string;
  isFinal?: boolean;
  message?: string;
  error?: string;
  code?: number;
}
interface ElevenLabsOutboundMessage {
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
  private readonly contentType: string;
  private readonly tokenPromise: Promise<string>;
  constructor(private readonly tokenFunc: GetToken, voice = ElevenLabsTextToSpeech.DEFAULT_VOICE, model=ElevenLabsTextToSpeech.DEFAULT_MODEL) {
    const model_id = model;
    const optimize_streaming_latency = '22'; // doesn't seem to have any effect
    const output_format = 'pcm_22050'; // 44100' requires $99/mo plan
    const params = new URLSearchParams({ model_id, optimize_streaming_latency, output_format });
    const url = `wss://api.elevenlabs.io/v1/text-to-speech/${voice}/stream-input?${params}`;
    super('eleven', url, voice);
    this.contentType = `${AUDIO_PCM_MIME_TYPE};rate=22050`;
    this.tokenPromise = this.tokenFunc(this.name);
  }
  protected handleMessage(inMessage: unknown) {
    const message = inMessage as ElevenLabsInboundMessage;
    console.debug(message);
    if (message.audio) {
      console.debug(`[${this.name}] chunk received`);
      this.queueChunk(new AudioChunk(this.contentType, Buffer.from(message.audio!, 'base64').buffer));
    } else if (message.isFinal) {
      console.log(`[${this.name}] utterance complete`);
    } else if (message.error) {
      console.error(`[${this.name}] error: ${message.message}`);
    }
  }
  protected async createOpenRequest(): Promise<ElevenLabsOutboundMessage> {
    return {
      text: ' ',
      voice_settings: {
        stability: 0.5,
        similarity: 0.8,
      },
      generation_config: {
        chunk_length_schedule: [50],
      },
      xi_api_key: await this.tokenPromise,
    };
  }
  protected createChunkRequest(text: string): ElevenLabsOutboundMessage {
    // try_trigger_generation tries to force generation of chunks as soon as possible.
    return { text: `${text} `, try_trigger_generation: true };
  }
  protected createFlushRequest(): ElevenLabsOutboundMessage {
    return { text: '' };
  }
}

class LmntOutboundMessage {
  constructor({ text, eof }: LmntOutboundMessage) {
    this.text = text;
    this.eof = eof;
  }
  text?: string;
  eof?: boolean;
}

export class LmntWebSocketTextToSpeech extends WebSocketTextToSpeech {
  private readonly tokenPromise: Promise<string>;
  constructor(private readonly tokenFunc: GetToken, voice = LmntTextToSpeech.DEFAULT_VOICE) {
    const url = 'wss://api.lmnt.com/speech/beta/synthesize_streaming';
    super('lmnt', url, voice);
    this.tokenPromise = tokenFunc(this.name);
  }
  protected async createOpenRequest() {
    return {
      voice: this.voice,
      'X-Api-Key': await this.tokenFunc(this.name),
    };
  }
  protected createChunkRequest(text: string): LmntOutboundMessage {
    return { text };
  }
  protected createFlushRequest(): LmntOutboundMessage {
    return { eof: true };
  }
}

export type TextToSpeechProtocol = 'rest' | 'ws';

export interface TextToSpeechOptions {
  provider: string;
  proto?: TextToSpeechProtocol;
  rate?: number;
  voice?: string;
  getToken?: GetToken;
  buildUrl?: BuildUrl;
}

/**
 * Factory function to create a text-to-speech service for the specified provider.
 */
export function createTextToSpeech({ provider, proto, voice, rate, model, getToken, buildUrl }: TextToSpeechOptions) {
  if (!proto || proto == 'rest') {
    switch (provider) {
      case 'azure':
        return new AzureTextToSpeech(buildUrl!, voice, rate);
      case 'aws':
        return new AwsTextToSpeech(buildUrl!, voice, rate);
      case 'eleven':
        return new ElevenLabsTextToSpeech(buildUrl!, voice, model);
      case 'gcp':
        return new GcpTextToSpeech(buildUrl!, voice, rate);
      case 'lmnt':
        return new LmntTextToSpeech(buildUrl!, voice, rate);
      case 'murf':
        return new MurfTextToSpeech(buildUrl!, voice, rate);
      case 'playht':
        return new PlayHTTextToSpeech(buildUrl!, voice, rate);
      case 'resemble':
        return new ResembleTextToSpeech(buildUrl!, voice, rate);
      case 'wellsaid':
        return new WellSaidTextToSpeech(buildUrl!, voice, rate);
      default:
        throw new Error(`unknown REST provider ${provider}`);
    }
  } else {
    switch (provider) {
      case 'eleven':
        return new ElevenLabsWebSocketTextToSpeech(getToken!, voice, model);
      case 'lmnt':
        return new LmntWebSocketTextToSpeech(getToken!, voice);
      default:
        throw new Error(`unknown WebSocket provider ${provider}`);
    }
  }
}
