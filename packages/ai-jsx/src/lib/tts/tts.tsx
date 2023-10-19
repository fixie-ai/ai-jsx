'use client';
import { split } from 'sentence-splitter';

// @ts-expect-error
import { MPEGDecoder } from 'mpg123-decoder';

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
const AUDIO_WAV_MIME_TYPE = 'audio/wav';
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
 * A chunk of PCM audio data with the specified sample rate in either S16 or F32 format.
 */
class AudioPcmBuffer {
  intBuffer?: Int16Array;
  floatBuffer?: Float32Array;
  constructor(public sampleRate: number, buffer: Int16Array | Float32Array) {
    if (buffer instanceof Int16Array) {
      this.intBuffer = buffer;
    } else if (buffer instanceof Float32Array) {
      this.floatBuffer = buffer;
    } else {
      throw new Error('unsupported buffer type');
    }
  }
  get intData() {
    if (!this.intBuffer) {
      this.intBuffer = new Int16Array(this.floatBuffer!.length);
      this.floatBuffer!.forEach((sample, index) => {
        const i16 = Math.max(-32768, Math.min(32767, Math.floor(sample * 32768)));
        this.intBuffer![index] = i16;
      });
    }
    return this.intBuffer;
  }
  get floatData() {
    if (!this.floatBuffer) {
      this.floatBuffer = new Float32Array(this.intBuffer!.length);
      this.intBuffer!.forEach((sample, index) => {
        const f32 = sample / 32768;
        this.floatBuffer![index] = f32;
      });
    }
    return this.floatBuffer;
  }
}

/**
 * A streaming audio decoder.
 * Consumes chunks of encoded audio data and emits chunks of PCM data.
 */
abstract class AudioDecoder {
  /**
   * Appends a chunk of encoded audio data to the decoder.
   */
  abstract addData(encodedBuffer: ArrayBuffer): void;
  /**
   * Flushes any remaining data from the decoder and resets its state.
   */
  abstract flush(): void;
  /**
   * Called when the decoder has decoded a chunk of PCM data.
   */
  onData?: (pcmBuffer: AudioPcmBuffer) => void;
  /**
   * Called when the decoder encounters an error.
   */
  onError?: (error: Error) => void;
}

/**
 * A streaming MP3 decoder, using mpg123-decoder.
 * See https://www.mp3-tech.org/programmer/frame_header.html
 */
class Mp3Decoder extends AudioDecoder {
  private readonly decoder: MPEGDecoder;
  private readonly decoderReadyPromise: Promise<void>;
  constructor() {
    super();
    this.decoder = new MPEGDecoder();
    this.decoderReadyPromise = this.decoder.ready;
  }
  async addData(encodedBuffer: ArrayBuffer) {
    await this.decoderReadyPromise;
    const byteBuffer = new Uint8Array(encodedBuffer);
    const { channelData, samplesDecoded, sampleRate, errors } = this.decoder.decode(byteBuffer);
    if (errors.length > 0) {
      this.onError?.(new Error(errors[0].message));
    } else if (samplesDecoded > 0) {
      console.debug(`decoded ${samplesDecoded} samples, sample rate=${sampleRate}`);
      const pcmBuffer = new AudioPcmBuffer(sampleRate, channelData[0]);
      this.onData?.(pcmBuffer);
    }
  }
  async flush() {
    await this.decoder.reset();
  }
}

/**
 * A streaming WAV decoder.
 * See http://midi.teragonaudio.com/tech/wave.htm
 */
class WavDecoder extends AudioDecoder {
  private static readonly RIFF_TAG = 'RIFF';
  private static readonly FMT_TAG = 'fmt ';
  private static readonly DATA_TAG = 'data';
  private static readonly WAVE_TYPE = 'WAVE';
  private static readonly RIFF_HEADER_LEN = 12;
  private static readonly CHUNK_HEADER_LEN = 8;
  private buffer: Uint8Array = new Uint8Array(0);
  private gotRiff = false;
  private sampleRate?: number;
  private numChannels?: number;
  private dataRead = 0;
  addData(encodedBuffer: ArrayBuffer) {
    const newBuffer = new Uint8Array(this.buffer.length + encodedBuffer.byteLength);
    newBuffer.set(new Uint8Array(this.buffer), 0);
    newBuffer.set(new Uint8Array(encodedBuffer), this.buffer.byteLength);
    this.buffer = newBuffer;
    this.processBuffer();
  }
  flush() {
    this.gotRiff = false;
    this.sampleRate = undefined;
    this.numChannels = undefined;
    this.dataRead = 0;
  }
  protected processBuffer() {
    let ok = true;
    while (ok) {
      // Our buffer should always start with a chunk header, with a 4-byte tag and length.
      ok = this.buffer.length >= WavDecoder.CHUNK_HEADER_LEN;
      if (ok) {
        const view = new DataView(this.buffer.buffer);
        const tag = this.getTag(view);
        const len = view.getUint32(4, true);
        if (!this.gotRiff) {
          ok = this.processRiffHeader(tag, len, view);
        } else if (tag != WavDecoder.DATA_TAG) {
          ok = this.processMetaChunk(tag, len);
        } else {
          ok = this.processData(len);
        }
      }
    }
  }
  private getTag(view: DataView, offset = 0): string {
    let str = '';
    for (let i = 0; i < 4; i++) {
      str += String.fromCharCode(view.getUint8(offset + i));
    }
    return str;
  }
  private processRiffHeader(tag: string, len: number, view: DataView) {
    // Make sure we have the entire header.
    if (view.byteLength < WavDecoder.RIFF_HEADER_LEN) {
      return false;
    }
    if (tag != WavDecoder.RIFF_TAG) {
      this.dispatchError(`expected RIFF tag, got ${tag}`);
      return false;
    }
    const type = this.getTag(view, 8);
    if (type != WavDecoder.WAVE_TYPE) {
      this.dispatchError(`expected WAVE type, got ${type}`);
      return false;
    }
    this.gotRiff = true;
    this.buffer = this.buffer.slice(WavDecoder.RIFF_HEADER_LEN);
    console.debug(`got RIFF chunk, len=${len}`);
    return true;
  }
  private processMetaChunk(tag: string, len: number) {
    // We only process complete chunks, so make sure it's all here.
    const headerLen = WavDecoder.CHUNK_HEADER_LEN;
    if (this.buffer.length < headerLen + len) {
      return false;
    }
    console.debug(`got chunk, tag=${tag} len=${len}`);
    if (tag == WavDecoder.FMT_TAG) {
      const chunk = this.buffer.slice(headerLen, headerLen + len);
      if (!this.processFmtChunk(chunk)) {
        return false;
      }
    }
    this.buffer = this.buffer.slice(headerLen + len);
    return true;
  }
  private processFmtChunk(chunk: Uint8Array) {
    const view = new DataView(chunk.buffer);
    const format = view.getUint16(0, true);
    if (format != 1) {
      this.dispatchError(`expected PCM format, got ${format}`);
      return false;
    }
    this.numChannels = view.getUint16(2, true);
    if (this.numChannels != 1) {
      this.dispatchError(`expected 1 channel, got ${this.numChannels}`);
      return false;
    }
    this.sampleRate = view.getUint32(4, true);
    const bitsPerSample = view.getUint16(14, true);
    if (bitsPerSample != 16) {
      this.dispatchError(`expected 16 bits per sample, got ${bitsPerSample}`);
      return false;
    }
    console.debug(`got fmt chunk, channels=${this.numChannels} sampleRate=${this.sampleRate}`);
    return true;
  }
  private processData(len: number) {
    // When reading the DATA tag, emit data as it's received, rather than waiting for the full chunk.
    // We only handle L16 PCM data, so we read in multiples of 2.
    const headerLen = WavDecoder.CHUNK_HEADER_LEN;
    let available = Math.min(len, this.buffer.length - headerLen) - this.dataRead;
    if (available % 2 != 0) {
      available--;
    }
    if (available == 0) {
      return false;
    }
    const startPos = WavDecoder.CHUNK_HEADER_LEN + this.dataRead;
    const dataBuffer = this.buffer.slice(startPos, startPos + available);
    // The Int16Array must be created from the ArrayBuffer, not the Uint8Array.
    const pcmBuffer = new AudioPcmBuffer(this.sampleRate!, new Int16Array(dataBuffer.buffer));
    this.dataRead += available;
    if (this.dataRead == len) {
      this.buffer = this.buffer.slice(headerLen + len);
    }
    // console.log(`got data chunk, len=${len} available=${available} dataRead=${this.dataRead}`);
    this.onData?.(pcmBuffer);
    return true;
  }
  private dispatchError(error: string) {
    this.onError?.(new Error(error));
  }
}

/**
 * An internal object used to manage an active audio stream.
 */
class AudioStream {
  private readonly outputNode: AudioWorkletNode;
  private readonly destNode: MediaStreamAudioDestinationNode;
  private readonly analyzerNode?: AnalyserNode;
  private nextSeqNum = 0;
  private decoder?: AudioDecoder;
  private playing = false;
  constructor(private readonly context: AudioContext, wantAnalyzer: boolean) {
    this.outputNode = new AudioWorkletNode(context, 'output-processor');
    this.destNode = context.createMediaStreamDestination();
    if (wantAnalyzer) {
      this.analyzerNode = this.context.createAnalyser();
      this.outputNode.connect(this.analyzerNode).connect(this.destNode);
    } else {
      this.outputNode.connect(this.destNode);
    }
    this.outputNode.port.onmessage = (e) => {
      this.handleBufferProcessed(e.data.seqNum);
    };
  }
  get stream() {
    return this.destNode.stream;
  }
  get streamId() {
    return this.destNode.stream.id;
  }
  get analyzer() {
    return this.analyzerNode;
  }
  appendBuffer(chunk: AudioChunk) {
    if (chunk.isPcm) {
      const pcmBuffer = new AudioPcmBuffer(chunk.sampleRate, new Int16Array(chunk.buffer));
      this.appendPcmBuffer(pcmBuffer);
      return;
    }
    const decoder = this.getDecoder(chunk.mimeType);
    decoder.addData(chunk.buffer);
  }
  flush() {
    this.decoder?.flush();
  }
  close() {
    this.outputNode.port.onmessage = null;
    this.outputNode.disconnect();
  }
  onPlaying?: (streamId: string) => void;
  onWaiting?: (streamId: string) => void;

  private getDecoder(mimeType: string) {
    if (!this.decoder) {
      if (mimeType == AUDIO_MPEG_MIME_TYPE) {
        this.decoder = new Mp3Decoder();
      } else if (mimeType == AUDIO_WAV_MIME_TYPE) {
        this.decoder = new WavDecoder();
      } else {
        throw new Error(`unsupported mime type ${mimeType}`);
      }
      this.decoder.onData = (pcmBuffer) => this.appendPcmBuffer(pcmBuffer);
      this.decoder.onError = (error) => console.error(error);
    }
    return this.decoder;
  }
  /**
   * Appends PCM audio data to the output node, converting and resampling if necessary.
   */
  private async appendPcmBuffer(inBuffer: AudioPcmBuffer) {
    const seqNum = this.nextSeqNum++;
    let buffer = inBuffer;
    if (buffer.sampleRate != this.context.sampleRate) {
      buffer = await this.resamplePcmBuffer(buffer);
    }
    this.appendNativeBuffer(seqNum, buffer.floatData);
  }
  /**
   * Resamples PCM audio data to the output node's sample rate, converting to f32 if necessary.
   */
  private async resamplePcmBuffer(inBuffer: AudioPcmBuffer) {
    const floatBuffer = inBuffer.floatData;
    const outSamples = Math.floor((floatBuffer.length * this.context!.sampleRate) / inBuffer.sampleRate);
    console.debug(
      `resampling, in len=${floatBuffer.length} out sample rate=${this.context!.sampleRate} out len=${outSamples}`
    );
    const offlineContext = new OfflineAudioContext({
      sampleRate: this.context!.sampleRate,
      numberOfChannels: 1,
      length: outSamples,
    });
    const source = offlineContext.createBufferSource();
    source.buffer = new AudioBuffer({
      sampleRate: inBuffer.sampleRate,
      length: floatBuffer.length,
      numberOfChannels: 1,
    });
    source.buffer.copyToChannel(floatBuffer, 0);
    source.connect(offlineContext.destination);
    source.start(0);
    const audioBuffer = await offlineContext.startRendering();
    return new AudioPcmBuffer(audioBuffer.sampleRate, audioBuffer.getChannelData(0));
  }
  /**
   * Appends f32 PCM audio data (with the correct sample rate) to the output node.
   */
  private appendNativeBuffer(seqNum: number, buffer: Float32Array) {
    console.debug(`buf added, seq num=${seqNum} len=${buffer.length}`);
    const channelData = [buffer];
    this.outputNode.port.postMessage({ seqNum, channelData });
    if (!this.playing) {
      this.playing = true;
      this.onPlaying?.(this.streamId);
    }
  }
  private handleBufferProcessed(seqNum: number) {
    console.debug(`buf consumed, seq num=${seqNum}`);
    if (seqNum == this.nextSeqNum - 1) {
      this.playing = false;
      this.onWaiting?.(this.streamId);
    }
  }
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
    console.log(`AudioOutputManager starting, sample rate=${this.context.sampleRate}`);

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
    const audioStream = new AudioStream(this.context!, wantAnalyzer);
    audioStream.onPlaying = (streamId) => this.handleStreamStateChange(streamId, true);
    audioStream.onWaiting = (streamId) => this.handleStreamStateChange(streamId, false);
    this.streams.set(audioStream.streamId, audioStream);
    return audioStream.stream;
  }
  destroyStream(streamId: string) {
    const audioStream = this.streams.get(streamId);
    if (!audioStream) {
      return;
    }
    audioStream.close();
    this.streams.delete(streamId);
  }
  getAnalyzer(streamId: string) {
    const audioStream = this.streams.get(streamId);
    if (!audioStream) {
      return;
    }
    return audioStream.analyzer;
  }
  appendBuffer(streamId: string, chunk: AudioChunk) {
    const audioStream = this.streams.get(streamId);
    if (!audioStream) {
      throw new Error(`stream ${streamId} not found`);
    }
    audioStream.appendBuffer(chunk);
  }
  flush(streamId: string) {
    const audioStream = this.streams.get(streamId);
    if (!audioStream) {
      throw new Error(`stream ${streamId} not found`);
    }
    audioStream.flush();
  }
  private handleStreamStateChange(streamId: string, playing: boolean) {
    // Ensure the stream is still alive.
    const audioStream = this.streams.get(streamId);
    if (!audioStream) {
      return;
    }
    const event = playing ? 'playing' : 'waiting';
    this.dispatchEvent(new CustomEvent(event, { detail: streamId }));
  }
}

const outputManager = new AudioOutputManager();
outputManager.start();

export interface BuildUrlOptions {
  provider: string;
  voice: string;
  rate: number;
  text: string;
  model?: string;
}

/**
 * A function that can be used to build a URL for a text-to-speech
 * service. This URL will be used to retrieve an audio file that can be
 * played by an HTML5 audio element.
 */
export type BuildUrl = (options: BuildUrlOptions) => string;

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
   * Warms up the text-to-speech service to prepare for an upcoming generation.
   */
  abstract warmup(): void;

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
    this.audio.src = this.urlFunc({ provider: this.name, text, voice: this.voice, rate: this.rate });
    this.audio.play();
  }
  flush() {}
  warmup() {}
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
export abstract class WebAudioTextToSpeech extends TextToSpeechBase {
  private streamId: string = '';
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
      outputManager.addEventListener('playing', (event: CustomEventInit<string>) => {
        if (event.detail == this.streamId) {
          this.setPlaying();
        }
      });
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
  protected appendChunk(chunk: AudioChunk) {
    console.debug(`[${this.name}] decoding chunk`);
    outputManager.appendBuffer(this.streamId, chunk);
  }

  /**
   * Processes the first chunk in the ordered chunk buffer, creating a new source node
   * and connecting it to the destination node. If the chunk is pending, no-op.
   */
  protected finishGeneration() {
    outputManager.flush(this.streamId);
  }

  protected abstract generate(_text: string): void;
  protected abstract doFlush(): void;
  protected abstract stopGeneration(): void;
  protected tearDown() {
    this.inProgress = false;
  }
}

class TextToSpeechRequest {
  public shortText: string;
  public readonly createTimestamp: number;
  public sendTimestamp?: number;
  public cancelled: boolean = false;
  constructor(public text: string) {
    this.createTimestamp = performance.now();
    this.shortText = text.length > 20 ? `${text.substring(0, 20)}...` : text;
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
    public readonly rate: number = 1.0,
    public readonly model?: string
  ) {
    super(name);
  }
  async warmup() {
    const warmupMillis = performance.now();
    await this.fetch(' ');
    const elapsed = performance.now() - warmupMillis;
    console.log(`[${this.name}] warmup complete, elapsed=${elapsed.toFixed(0)} ms`);
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
  protected doFlush() {
    const utterance = this.pendingText.trim();
    this.pendingText = '';
    if (utterance) {
      this.queueRequest(utterance);
    }
  }
  protected stopGeneration(): void {
    console.log(`[${this.name}] cancelling requests`);
    this.requestQueue.forEach((req) => (req.cancelled = true));
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

    await this.dispatchRequest(this.requestQueue[0]);
    this.requestQueue.shift();
    this.processRequestQueue();
  }
  private async dispatchRequest(req: TextToSpeechRequest) {
    if (req.cancelled) {
      console.log(`[${this.name}] ignoring cancelled request: ${req.shortText}`);
      return;
    }

    req.sendTimestamp = performance.now();
    console.log(`[${this.name}] requesting chunk: ${req.shortText}`);
    const res = await this.fetch(req.text);
    if (!res.ok) {
      this.stop();
      this.setComplete(new Error(`[${this.name}] generation request failed: ${res.status} ${res.statusText}`));
      return;
    }

    const contentType = res.headers.get('content-type') ?? AUDIO_MPEG_MIME_TYPE;
    console.log(`[${this.name}] received response: ${req.shortText}, type=${res.headers.get('content-type')}`);
    const reader = res.body!.getReader();
    while (true) {
      const { value, done } = await reader.read();
      // eslint seems to think req.cancelled must be false, perhaps due to the earlier check.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (req.cancelled) {
        return;
      }
      if (done) {
        break;
      }
      console.debug(`[${this.name}] received chunk buffer: ${req.shortText}, len=${value.length}`);
      this.appendChunk(new AudioChunk(contentType, value.buffer));
    }
    this.finishGeneration();
  }
  private fetch(text: string) {
    const url = this.urlFunc({ provider: this.name, text, voice: this.voice, rate: this.rate, model: this.model });
    return fetch(url);
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
  constructor(
    urlFunc: BuildUrl,
    voice: string = ElevenLabsTextToSpeech.DEFAULT_VOICE,
    rate: number = 1.0,
    model = ElevenLabsTextToSpeech.DEFAULT_MODEL
  ) {
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
    // We call the non-edge version so we can use the PlayHT gRPC client, which is faster.
    super('playht-grpc', urlFunc, voice, rate);
    this.warmup();
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
  private socket?: WebSocket;
  // Whether the socket is open and authed so that we can send requests.
  private socketReady: boolean = false;
  // Message buffer for when the socket is not yet ready.
  private readonly socketBuffer: string[] = [];
  private pendingText: string = '';
  constructor(name: string, private readonly url: string, public readonly voice: string) {
    super(name);
    this.warmup();
  }
  warmup() {
    this.ensureSocket();
  }
  protected generate(text: string) {
    // Reopen our socket if it timed out.
    this.ensureSocket();

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
    this.socket?.close();
    this.socketBuffer.length = 0;
    this.pendingText = '';
    this.ensureSocket();
  }
  protected tearDown() {
    this.socket?.close();
    super.tearDown();
  }

  /**
   * Set up a web socket to the given URL, and reconnect if it closes normally
   * so that we're usually ready to generate with minimal latency.
   */
  protected ensureSocket() {
    if (this.socket) {
      return;
    }
    const connectMillis = performance.now();
    const socket = new WebSocket(this.url);
    socket.binaryType = 'arraybuffer';
    socket.onopen = async (_event) => {
      const elapsed = performance.now() - connectMillis;
      console.log(`[${this.name}] socket opened, elapsed=${elapsed.toFixed(0)}`);
      const openMsg = await this.createOpenRequest();
      if (openMsg) {
        this.socketBuffer.unshift(JSON.stringify(openMsg));
      }
      this.socketBuffer.forEach((json) => this.socket!.send(json));
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
        this.appendChunk(new AudioChunk(AUDIO_MPEG_MIME_TYPE, event.data));
      }
    };
    socket.onerror = (_event) => {
      console.log(`[${this.name}] socket error`);
    };
    socket.onclose = (event) => {
      // Reopen the socket if it closed normally, i.e., not due to an error.
      console.log(`[${this.name}] socket closed, code=${event.code} reason=${event.reason}`);
      if (event.code == 1000) {
        this.ensureSocket();
      } else {
        this.socket = undefined;
        this.socketReady = false;
      }
    };
    this.socket = socket;
    this.socketReady = false;
  }
  protected sendObject(obj: unknown) {
    const json = JSON.stringify(obj);
    if (this.socketReady) {
      this.socket!.send(json);
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
    similarity_boost: boolean;
  };
  generation_config?: {
    chunk_length_schedule: number[];
  };
  try_trigger_generation?: boolean;
  xi_api_key?: string;
}

/**
 * Text-to-speech implementation that uses Eleven Labs' text-to-speech service,
 * as described at https://docs.elevenlabs.io/api-reference/text-to-speech-websockets
 */
export class ElevenLabsWebSocketTextToSpeech extends WebSocketTextToSpeech {
  private readonly contentType: string;
  private readonly tokenPromise: Promise<string>;
  constructor(
    private readonly tokenFunc: GetToken,
    voice = ElevenLabsTextToSpeech.DEFAULT_VOICE,
    model = ElevenLabsTextToSpeech.DEFAULT_MODEL
  ) {
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
      this.appendChunk(new AudioChunk(this.contentType, Buffer.from(message.audio!, 'base64').buffer));
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
        similarity_boost: false,
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
  constructor(tokenFunc: GetToken, voice = LmntTextToSpeech.DEFAULT_VOICE) {
    const url = 'wss://api.lmnt.com/speech/beta/synthesize_streaming';
    super('lmnt', url, voice);
    this.tokenPromise = tokenFunc(this.name);
  }
  protected async createOpenRequest() {
    return {
      voice: this.voice,
      'X-Api-Key': await this.tokenPromise,
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
  model?: string;
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
        return new ElevenLabsTextToSpeech(buildUrl!, voice, rate, model);
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
