'use client';
import { LibfVoiceActivityDetector, VoiceActivityDetectorBase } from './vad.js';

const AUDIO_WORKLET_SRC = `
class InputProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    for (let channel = 0; channel < input.length; ++channel) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];

      for (let i = 0; i < inputChannel.length; ++i) {
        outputChannel[i] = inputChannel[i];
      }
    }

    // Copy the input data to a new Float32Array
    const data = new Float32Array(input[0]);

    // Post the data back to the main thread
    this.port.postMessage(data);

    return true;
  }
}

registerProcessor("input-processor", InputProcessor);
`;
const AUDIO_WORKLET_NUM_SAMPLES = 128;

function bufferToBase64(buffer: ArrayBuffer) {
  const numberArray: number[] = Array.from(new Uint8Array(buffer));
  return btoa(String.fromCharCode.apply(null, numberArray));
}

/**
 * Removes caps, punctuation, and extra whitespace from a string.
 */
export function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]|_/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Represents a single voice activity event from a VAD.
 * @param active Indicates whether voice is currently active.
 * @param timestamp The stream time (relative to the start of the audio)
 * in milliseconds when the voice activity changed, as reported by the VAD.
 */
export class VoiceActivity {
  constructor(public active: boolean, public timestamp: number) {}
}

/**
 * Manages capturing audio from the microphone or a URL (for testing).
 * Currently uses a WebAudio worker, but we may want to switch to MediaRecorder
 * in the future so that we can emit Opus encoded frames.
 * Once started, emits "chunk" events containing 16-bit PCM audio data of
 * duration no shorter than `timeslice` milliseconds.
 * Also emits "vad" events upon voice activity or silence being detected.
 * Currently, the VAD is quite primitive with a speech threshold of -50 dbFS.
 */
export class MicManager extends EventTarget {
  private numSamples: number = 0;
  private outBuffer?: Float32Array[];
  private context?: AudioContext;
  private streamElement?: HTMLAudioElement;
  private stream?: MediaStream;
  private processorNode?: AudioWorkletNode;
  private analyzerNode?: AnalyserNode;
  private vad?: VoiceActivityDetectorBase;

  /**
   * Starts capture from the microphone.
   */
  async startMic(timeslice: number, onEnded: () => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.startGraph(timeslice, onEnded);
  }
  /**
   * Starts capture from a supplied MediaStream.
   */
  startStream(stream: MediaStream, timeslice: number, onEnded: () => void) {
    this.stream = stream;
    this.startGraph(timeslice, onEnded);
  }
  /**
   * Starts capture from an audio file at a specified URL, useful for testing.
   */
  async startFile(url: string, timeslice: number, onEnded: () => void) {
    const response = await fetch(url);
    const blob = await response.blob();
    this.streamElement = new Audio();
    this.streamElement.src = URL.createObjectURL(blob);
    await this.streamElement.play();
    await this.startGraph(timeslice, onEnded);
  }
  /**
   * Stops capture.
   */
  stop() {
    this.vad?.stop();
    this.analyzerNode?.disconnect();
    this.processorNode?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.streamElement?.pause();
    this.context?.close();
    this.vad = undefined;
    this.analyzerNode = undefined;
    this.processorNode = undefined;
    this.stream = undefined;
    this.context = undefined;
    this.outBuffer = [];
  }
  /**
   * Returns the sample rate of the capturer.
   */
  get sampleRate() {
    return this.context ? this.context.sampleRate : 0;
  }
  /**
   * Returns the number of milliseconds of audio captured so far.
   */
  get currentMillis() {
    return (this.numSamples / this.sampleRate) * 1000;
  }
  /**
   * Returns true if the capturer is currently capturing audio.
   */
  get isActive() {
    return Boolean(this.context);
  }
  /**
   * Returns true if the voice activity is currently detected.
   */
  get isVoiceActive() {
    return this.vad?.isVoiceActive ?? false;
  }
  /**
   * Returns an analyzer node, which can be queried for audio levels and other info.
   */
  get analyzer() {
    return this.analyzerNode;
  }

  /**
   * Starts the audio graph based on either `this.stream` or `this.streamElement`.
   */
  private async startGraph(timeslice: number, onEnded?: () => void, wantAnalyzer = true) {
    this.numSamples = 0;
    this.outBuffer = [];
    this.context = new window.AudioContext({ sampleRate: 16000 });
    console.log(`MicManager starting graph, sample rate=${this.context.sampleRate}`);

    // Set up our input processor worklet.
    const workletSrcBlob = new Blob([AUDIO_WORKLET_SRC], {
      type: 'application/javascript',
    });
    const workletSrcUrl = URL.createObjectURL(workletSrcBlob);
    await this.context!.audioWorklet.addModule(workletSrcUrl);
    this.processorNode = new AudioWorkletNode(this.context, 'input-processor');
    this.processorNode.port.onmessage = (event) => {
      this.numSamples += AUDIO_WORKLET_NUM_SAMPLES;
      this.outBuffer!.push(event.data);
      const bufMillis = ((AUDIO_WORKLET_NUM_SAMPLES * this.outBuffer!.length) / this.sampleRate) * 1000;
      if (bufMillis >= timeslice) {
        const chunkEvent = new CustomEvent('chunk', {
          detail: this.makeAudioChunk(this.outBuffer!),
        });
        this.dispatchEvent(chunkEvent);
        this.outBuffer = [];
      }
      this.vad?.processFrame(event.data);
    };

    // Set up our source to wrap the provider input.
    let source;
    if (this.stream) {
      source = this.context.createMediaStreamSource(this.stream);
      this.stream.getAudioTracks()[0].onended = () => {
        console.log('MicManager stream ended');
        this.stop();
        onEnded?.();
      };
    } else if (this.streamElement) {
      source = this.context.createMediaElementSource(this.streamElement);
      this.streamElement.onpause = () => {
        console.log('MicManager element paused');
        this.stop();
        onEnded?.();
      };
    } else {
      throw new Error('No stream or streamElement');
    }

    // Connect the graph.
    // Only connect the destination if we're playing a file,
    // since we don't want to hear our own mic.
    if (wantAnalyzer) {
      this.analyzerNode = this.context.createAnalyser();
      source.connect(this.analyzerNode).connect(this.processorNode);
    } else {
      source.connect(this.processorNode);
    }
    if (this.streamElement) {
      source.connect(this.context.destination);
    }

    // Start the VAD.
    this.vad = new LibfVoiceActivityDetector(this.sampleRate);
    this.vad.onVoiceStart = () => {
      console.log(`Speech begin: ${this.currentMillis.toFixed(0)} ms`);
      this.dispatchEvent(new CustomEvent('vad', { detail: new VoiceActivity(true, this.currentMillis) }));
    };
    this.vad.onVoiceEnd = () => {
      console.log(`Speech FINAL: ${this.currentMillis.toFixed(0)} ms`);
      this.dispatchEvent(new CustomEvent('vad', { detail: new VoiceActivity(false, this.currentMillis) }));
    };
    this.vad.start();

    console.log('MicManager graph started');
  }

  /**
   * Converts a list of Float32Arrays to a single ArrayBuffer of 16-bit
   * little-endian Pulse Code Modulation (PCM) audio data, which is
   * the universal format for ASR providers.
   * Also updates the Voice Activity Detection (VAD) state based on the
   * average energy of the audio data.
   */
  private makeAudioChunk(inBuffers: Float32Array[]) {
    const byteLength = inBuffers.reduce((sum, inBuffer) => sum + inBuffer.length, 0) * 2;
    const outBuffer = new ArrayBuffer(byteLength);
    const view = new DataView(outBuffer);
    let index = 0;
    inBuffers.forEach((inBuffer) => {
      inBuffer.forEach((sample) => {
        const i16 = Math.max(-32768, Math.min(32767, Math.floor(sample * 32768)));
        view.setInt16(index, i16, true);
        index += 2;
      });
    });
    return outBuffer;
  }
}

/**
 * Defines a function that can be used to retrieve an ephemeral access token
 * for us with a speech recognition service. Typically, this will be a
 * fetch request to a server that will return an opaque token.
 */
export type GetToken = (provider: string) => Promise<string>;

/**
 * Represents a single transcript from a speech recognition service. The
 * transcript should correlate to a single utterance (sentence or phrase).
 * @param text The text of the transcript for the utterance.
 * @param final Indicates whether this is a partial or final transcript.
 * As the name implies, if the final flag is set, no further transcripts
 * will be received for this utterance.
 * @param timestamp The stream time (relative to the start of the audio) ++++
 * in milliseconds that this transcript reflects, i.e., the amount of
 * audio that has been recognized so far. The accuracy of this value
 * varies substantially by provider, making it hard to depend on.
 * @param reportedLatency The latency of the transcript in milliseconds,
 * as reported by the ASR service. It is computed from `timestamp`.
 * @param observedLatency The latency of the transcript in milliseconds,
 * between when our VAD detected silence and the transcript was received.
 * This is only filled in for final transcripts.
 */
export class Transcript {
  constructor(
    public text: string,
    public final: boolean,
    public timestamp: number,
    public recognitionTimestamp: number,
    public reportedLatency?: number,
    public observedLatency?: number
  ) {}
}

/**
 * Base class for live speech recognizers that wraps a web socket
 * connection to a speech recognition server.
 * Override createOpenRequest/handleMessage/sendChunk to customize for a particular
 * speech recognition service.
 */
export abstract class SpeechRecognitionBase extends EventTarget {
  /** A wall time representing when the first chunk was sent. */
  private initialChunkMillis: number = 0;
  /** A relative time indicating how much audio data has been sent. */
  private streamSentMillis: number = 0;
  /** A relative time indicating how much audio data has been recognized. */
  protected streamRecognizedMillis: number = 0;
  /** A relative time indicating the first time a transcript was received for the current utterance. */
  protected streamFirstTranscriptMillis: number = 0;
  /** A relative time indicating when local VAD indicated the end of the current utterance. */
  protected streamLastVoiceEndMillis: number = 0;
  private outBuffer: ArrayBuffer[] = [];
  protected socket?: WebSocket;
  protected socketReady: boolean = false;

  constructor(
    protected name: string,
    protected manager: MicManager,
    protected tokenFunc: GetToken,
    protected language?: string,
    protected model?: string
  ) {
    super();
  }
  /**
   * Starts the speech recognizer.
   */
  abstract start(): void;
  /**
   * Stops the speech recognizer.
   */
  close() {
    if (this.socket) {
      this.sendClose();
      this.socket.close();
    }
  }

  protected fetchToken() {
    return this.tokenFunc(this.name);
  }
  protected startInternal(url: string, protocols?: string[]) {
    const startTime = performance.now();
    console.log(`[${this.name}] socket connecting...`);
    this.outBuffer = [];
    this.socket = new WebSocket(url, protocols);
    this.socketReady = false;
    this.socket.binaryType = 'arraybuffer';
    this.socket.onopen = async (_event) => {
      const elapsed = performance.now() - startTime;
      console.log(`[${this.name}] socket opened, elapsed=${elapsed.toFixed(0)}`);
      const req = await this.createOpenRequest();
      if (req) {
        this.socket!.send(JSON.stringify(req));
      }
      this.flush();
      this.socketReady = true;
    };
    this.socket.onmessage = (event) => {
      let result;
      try {
        result = JSON.parse(event.data);
      } catch (error) {
        console.error(`Failed to parse socket message: ${error}`);
        return;
      }
      this.handleMessage(result);
    };
    this.socket.onerror = (_event) => {
      console.log(`[${this.name}] socket error`);
    };
    this.socket.onclose = (event) => {
      console.log(`[${this.name}] socket closed, code=${event.code} reason=${event.reason}`);
    };
    this.manager.addEventListener('chunk', (evt: CustomEventInit<ArrayBuffer>) => {
      const chunk = evt.detail!;
      if (this.socketReady) {
        this.sendChunk(chunk);
        // Set our reference time for computing latency when sending our first unbuffered chunk.
        if (this.initialChunkMillis == 0) {
          this.initialChunkMillis = performance.now() - this.streamSentMillis;
        }
      } else {
        // If the web socket isn't open yet, buffer the chunk.
        this.outBuffer.push(chunk);
      }
      this.streamSentMillis += (chunk.byteLength / (2 * this.manager.sampleRate)) * 1000;
    });
    this.manager.addEventListener('vad', (evt: CustomEventInit<VoiceActivity>) => {
      const update = evt.detail!;
      if (!update.active) {
        if (this.streamLastVoiceEndMillis === 0 && this.streamFirstTranscriptMillis !== 0) {
          this.streamLastVoiceEndMillis = update.timestamp;
        } else {
          console.log(`[${this.name}] unexpected voice end at ${update.timestamp}`);
        }
      }
    });
  }
  /**
   * Computes the delta between now and a relative time in the stream.
   */
  private computeLatency(streamMillis: number) {
    if (!this.initialChunkMillis) {
      return;
    }
    return performance.now() - (this.initialChunkMillis + streamMillis);
  }

  protected dispatchTranscript(transcript: string, final: boolean, recognizedMillis: number) {
    if (!final && recognizedMillis < this.streamRecognizedMillis) {
      console.warn(`[${this.name}] recognition time ${recognizedMillis} < ${this.streamRecognizedMillis}, ignoring`);
      return;
    }

    this.streamRecognizedMillis = recognizedMillis;
    const reportedLatency = this.computeLatency(recognizedMillis);
    let observedLatency;
    if (final) {
      observedLatency = this.computeLatency(this.streamLastVoiceEndMillis);
      this.streamFirstTranscriptMillis = this.streamLastVoiceEndMillis = 0;
    } else if (this.streamFirstTranscriptMillis == 0) {
      this.streamFirstTranscriptMillis = recognizedMillis;
    }
    const event = new CustomEvent('transcript', {
      detail: new Transcript(
        transcript,
        final,
        performance.now() - this.initialChunkMillis,
        recognizedMillis,
        reportedLatency,
        observedLatency
      ),
    });
    this.dispatchEvent(event);
  }
  protected createOpenRequest(): any {}
  protected handleMessage(_result: any) {}
  protected sendChunk(chunk: ArrayBuffer) {
    this.socket!.send(chunk);
  }
  protected flush() {
    if (this.outBuffer.length > 0) {
      const bufMillis = (this.outBuffer.length * AUDIO_WORKLET_NUM_SAMPLES * 1000) / this.manager.sampleRate;
      console.log(`[${this.name}] flushing ${bufMillis} ms of buffered audio`);
    }
    this.outBuffer.forEach((chunk) => this.sendChunk(chunk));
    this.outBuffer = [];
  }
  protected sendClose() {}
}

/**
 * Speech recognizer that uses the Deepgram service, as described at
 * https://developers.deepgram.com/reference/streaming
 */
export class DeepgramSpeechRecognition extends SpeechRecognitionBase {
  private buf = '';
  constructor(manager: MicManager, tokenFunc: GetToken, language?: string, model?: string) {
    super('deepgram', manager, tokenFunc, language, model);
  }
  async start() {
    this.buf = '';
    const params = new URLSearchParams({
      tier: 'nova',
      model: this.model ?? 'general',
      version: 'latest',
      encoding: 'linear16',
      channels: '1',
      sample_rate: this.manager.sampleRate.toString(),
      punctuate: 'true',
      interim_results: 'true',
      endpointing: '300',
    });
    if (this.language) {
      params.set('language', this.language);
    }
    const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
    super.startInternal(url, ['token', await this.fetchToken()]);
  }
  /**
   * Parses a transcript message in the following format:
   * {
   *   "type":"Results",
   *   "channel_index":[0,1],
   *   "duration":1.03,
   *   "start":0,
   *   "is_final":true,
   *   "speech_final":true,
   *   "channel":{
   *     "alternatives":[{
   *       "transcript":"Number one.",
   *       "confidence":0.9888439,
   *       "words":[
   *         ...
   *       ]
   *     }],
   *     "metadata":{
   *       "request_id":"8f415d00-e883-4949-83d7-9b3f34c8f0aa",
   *       "model_info":{"name":"general-nova","version":"2023-07-06.22746","arch":"nova"},
   *       "model_uuid":"aa274f3c-e8b3-456a-ac08-dfd797d45514"
   *     }
   *   }
   * }
   */
  protected handleMessage(result: any) {
    if (result.type == 'Results') {
      const recognizedMillis = (result.start + result.duration) * 1000;
      let transcript = this.buf ? `${this.buf} ` : '';
      transcript += result.channel.alternatives[0].transcript;
      if (transcript) {
        this.dispatchTranscript(transcript, result.is_final && result.speech_final, recognizedMillis);
        if (result.speech_final) {
          this.buf = '';
        } else if (result.is_final) {
          this.buf = transcript;
        }
      }
    } else {
      console.log(`deepgram: unhandled message type: ${result.type}`);
    }
  }
  protected sendClose() {
    this.socket!.send(JSON.stringify({ type: 'CloseStream' }));
  }
}

/**
 * Speech recognizer that uses the Soniox service, as described at
 * https://github.com/soniox/web_voice/blob/master/src/web_voice.js
 */
export class SonioxSpeechRecognition extends SpeechRecognitionBase {
  private static readonly END_TOKEN = '<end>';
  private tokenPromise?: Promise<string>;
  private buf = '';
  constructor(manager: MicManager, tokenFunc: GetToken, language?: string) {
    super('soniox', manager, tokenFunc, language);
  }
  start() {
    this.buf = '';
    this.tokenPromise = this.fetchToken();
    super.startInternal('wss://api.soniox.com/transcribe-websocket');
  }
  protected async createOpenRequest() {
    return {
      api_key: await this.tokenPromise!,
      sample_rate_hertz: this.manager.sampleRate,
      include_nonfinal: true,
      enable_endpoint_detection: true,
      speech_context: null,
      model: `${(this.language ?? 'en').slice(0, 2)}_v2_lowlatency`,
    };
  }
  /**
   * Parses a transcript message in the following format:
   * {
   *   "fw": [],
   *   "nfw": [
   *     ...
   *   ],
   *   "fpt": 3120,
   *   "tpt": 5040,
   *   "dbg": "",
   *   "spks": []
   * }
   */
  protected handleMessage(result: any) {
    const nonFinalWords = this.concatWords(result.nfw);
    const finalWords = this.concatWords(result.fw);
    let transcript = (this.buf + finalWords.transcript).trimStart();
    if (finalWords.done) {
      this.dispatchTranscript(transcript, true, result.tpt);
      this.buf = '';
    } else {
      this.buf = transcript;
    }
    if (nonFinalWords.transcript) {
      transcript = (this.buf + nonFinalWords.transcript).trimStart();
      this.dispatchTranscript(transcript, false, result.tpt);
    }
  }
  protected sendClose() {
    this.socket!.send('');
  }
  private concatWords(words: any[]) {
    const append = (transcript: string, w: any) => transcript + w.t;
    let transcript = words.reduce(append, '');
    let done = false;
    if (transcript.endsWith(SonioxSpeechRecognition.END_TOKEN)) {
      transcript = transcript.slice(0, -SonioxSpeechRecognition.END_TOKEN.length);
      done = true;
    }
    return { transcript, done };
  }
}

/**
 * Speech recognizer that uses the Gladia service, as described at
 * https://docs.gladia.io/reference/live-audio
 */
export class GladiaSpeechRecognition extends SpeechRecognitionBase {
  private tokenPromise?: Promise<string>;
  constructor(manager: MicManager, tokenFunc: GetToken, language?: string) {
    super('gladia', manager, tokenFunc, language);
  }
  start() {
    this.tokenPromise = this.fetchToken();
    super.startInternal('wss://api.gladia.io/audio/text/audio-transcription');
  }
  protected async createOpenRequest() {
    return {
      x_gladia_key: await this.tokenPromise,
      sample_rate: this.manager.sampleRate,
      encoding: 'wav',
      // 300ms endpointing by default
      language: this.language?.slice(0, 2) == 'en' ? 'english' : null,
    };
  }
  /**
   * Parses a transcript message in the following format:
   * {
   *   "transcription": " Burt canoes.",
   *   "confidence": 0.26,
   *   "language": "cy",
   *   "type": "partial",
   *   "time_begin": 2.146,
   *   "time_end": 2.8375625,
   *   "duration": 2.8375625
   * }
   */
  protected handleMessage(result: any) {
    if (result.transcription) {
      this.dispatchTranscript(result.transcription.trim(), result.type == 'final', result.time_end * 1000);
    }
    if (result.error) {
      console.error(result);
    }
  }
  protected sendChunk(chunk: ArrayBuffer) {
    return this.socket!.send(JSON.stringify({ frames: bufferToBase64(chunk) }));
  }
}

/**
 * Speech recognizer that uses the AssemblyAI service, as described at
 * https://www.assemblyai.com/docs/guides/real-time-streaming-transcription
 */
export class AssemblyAISpeechRecognition extends SpeechRecognitionBase {
  constructor(manager: MicManager, tokenFunc: GetToken, language?: string) {
    super('aai', manager, tokenFunc, language);
  }
  async start() {
    super.startInternal(
      `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${this.manager.sampleRate}&token=${await this.fetchToken()}`
    );
  }
  /**
   * Parses a transcript message in the following format:
   * {
   *   "audio_start": 3550,
   *   "audio_end": 6220,
   *   "confidence": 0.808775927873343,
   *   "text": "the birch canoe slid",
   *   "words": [
   *     ...
   *   ],
   *   "created": "2023-08-29T21:54:22.530192",
   *   "message_type": "PartialTranscript"
   * }
   */
  protected handleMessage(result: any) {
    if (result.message_type == 'PartialTranscript' || result.message_type == 'FinalTranscript') {
      if (result.text) {
        this.dispatchTranscript(result.text, result.message_type == 'FinalTranscript', result.audio_end);
      }
    } else if (result.message_type != 'SessionBegins') {
      console.log(`aai: unhandled message type: ${result.message_type}`);
    }
  }
  protected sendChunk(chunk: ArrayBuffer) {
    this.socket!.send(JSON.stringify({ audio_data: bufferToBase64(chunk) }));
  }
  protected sendClose() {
    this.socket!.send(JSON.stringify({ terminate_session: true }));
  }
}

/**
 * Speech recognizer that uses the Speechmatics service, as described at
 * https://docs.speechmatics.com/rt-api-ref
 */
export class SpeechmaticsSpeechRecognition extends SpeechRecognitionBase {
  private buf = '';
  constructor(manager: MicManager, tokenFunc: GetToken, language?: string) {
    super('speechmatics', manager, tokenFunc, language);
  }
  async start() {
    this.buf = '';
    const languageCode = this.language?.slice(0, 2) ?? 'en';
    super.startInternal(`wss://eu.rt.speechmatics.com/v2/${languageCode}?jwt=${await this.fetchToken()}`);
  }
  protected createOpenRequest() {
    return {
      message: 'StartRecognition',
      audio_format: {
        type: 'raw',
        encoding: 'pcm_s16le',
        sample_rate: this.manager.sampleRate,
      },
      transcription_config: {
        language: this.language?.slice(0, 2) ?? 'en',
        enable_partials: true,
        max_delay: 2, // the minimum (seconds)
      },
    };
  }
  /**
   * Parses a transcript message in the following format:
   * {
   *   "message": "AddTranscript",
   *   "format": "2.9",
   *   "results": [
   *     ...
   *   ],
   *   "metadata": {
   *     "end_time": 4.71,
   *     "start_time": 2.88,
   *     "transcript": ". The birch canoe "
   *   }
   * }
   */
  protected handleMessage(result: any) {
    if (result.message == 'AddPartialTranscript') {
      const transcript = this.cleanTranscript(result.metadata.transcript);
      this.dispatchTranscript(this.buf + transcript, false, result.metadata.end_time * 1000);
    } else if (result.message == 'AddTranscript') {
      if (result.metadata.transcript) {
        const transcript = this.cleanTranscript(result.metadata.transcript);
        if (!('is_eos' in result.results[0])) {
          this.buf += transcript;
        } else {
          this.dispatchTranscript(this.buf, true, result.metadata.end_time * 1000);
          this.buf = transcript;
        }
      }
    } else if (result.message != 'AudioAdded' && result.message != 'RecognitionStarted' && result.message != 'Info') {
      console.log(`speechmatics: unhandled message type: ${result.message}`);
    }
  }
  /**
   * Speechmatics transcripts typically include the trailing punctuation from
   * the previous utterance, so we discard it if present.
   */
  private cleanTranscript(transcript: string) {
    // Remove leading punctuation and whitespace.
    return transcript.replace(/^[\s.,?!]+/, '');
  }
}

/**
 * Speech recognizer that uses the Rev AI service, as described at
 * https://docs.rev.ai/api/streaming/
 */
export class RevAISpeechRecognition extends SpeechRecognitionBase {
  constructor(manager: MicManager, tokenFunc: GetToken, language?: string) {
    super('revai', manager, tokenFunc, language);
  }
  async start() {
    const params = new URLSearchParams({
      access_token: await this.fetchToken(),
      content_type: `audio/x-raw;layout=interleaved;rate=${this.manager.sampleRate};format=S16LE;channels=1`,
    });
    if (this.language) {
      params.set('language', this.language.slice(0, 2));
    }
    const url = `wss://api.rev.ai/speechtotext/v1/stream?${params.toString()}`;
    super.startInternal(url);
  }
  /**
   * Parses a transcript message in the following format:
   * {
   *   "type": "final",
   *   "ts": 0.11,
   *   "end_ts": 4.19,
   *   "elements": [
   *     ...
   *   ]
   * }
   */
  protected handleMessage(result: any) {
    // console.log(result);
    if (result.type == 'partial') {
      const text = result.elements.reduce((t: string, w: any) => `${t}${w.value} `, '');
      this.dispatchTranscript(text, false, result.end_ts * 1000);
    } else if (result.type == 'final') {
      const text = result.elements.reduce((t: string, w: any) => t + w.value, '');
      this.dispatchTranscript(text, true, result.end_ts * 1000);
    } else {
      console.log(`revai: unhandled message type: ${result.type}`);
    }
  }
}

export class SpeechRecognitionOptions {
  public language?: string;
  public model?: string;
  constructor(public provider: string, public manager: MicManager, public getToken: GetToken) {}
}

/**
 * Creates a speech recoginzer of the given type (e.g., 'deepgram').
 */
export function createSpeechRecognition({ provider, manager, getToken, language, model }: SpeechRecognitionOptions) {
  switch (provider) {
    case 'deepgram':
      return new DeepgramSpeechRecognition(manager, getToken, language, model);
    case 'soniox':
      return new SonioxSpeechRecognition(manager, getToken, language);
    case 'gladia':
      return new GladiaSpeechRecognition(manager, getToken, language);
    case 'aai':
      return new AssemblyAISpeechRecognition(manager, getToken, language);
    case 'speechmatics':
      return new SpeechmaticsSpeechRecognition(manager, getToken, language);
    case 'revai':
      return new RevAISpeechRecognition(manager, getToken, language);
    default:
      throw new Error(`Unknown speech recognition type: ${provider}`);
  }
}
