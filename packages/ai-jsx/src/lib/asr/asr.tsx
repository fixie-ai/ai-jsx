'use client';
import { SileroVoiceActivityDetector, VoiceActivityDetectorBase } from "./vad.js";

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
 * Manages capturing audio from the microphone or a URL (for testing).
 * Currently uses a WebAudio worker, but we may want to switch to MediaRecorder
 * in the future so that we can emit Opus encoded frames.
 * Once started, emits "chunk" events containing 16-bit PCM audio data of
 * duration no shorter than `timeslice` milliseconds.
 * Also emits "vad" events upon voice activity or silence being detected.
 * Currently, the VAD is quite primitive with a speech threshold of -50 dbFS.
 */
export class MicManager extends EventTarget {
  private outBuffer?: Float32Array[];
  private context?: AudioContext;
  private streamElement?: HTMLAudioElement;
  private stream?: MediaStream;
  private processorNode?: AudioWorkletNode;
  private vad?: VoiceActivityDetectorBase;

  /**
   * Starts capture from the microphone.
   */
  async startMic(timeslice: number, onEnded: () => void) {
    this.startGraph(await navigator.mediaDevices.getUserMedia({ audio: true }), timeslice, onEnded);
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
    // TODO(juberti): replace use of this API (not present in Safari) with Web Audio.
    const stream = await (this.streamElement as any).captureStream();
    this.streamElement.onpause = () => {
      console.log('MicManager audio element paused');
      stream.getAudioTracks()[0].onended();
    };
    await this.startGraph(stream, timeslice, onEnded);
  }
  /**
   * Stops capture.
   */
  stop() {
    this.processorNode?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.streamElement?.pause();
    this.context?.close();
    this.processorNode = undefined;
    this.stream = undefined;
    this.context = undefined;
    this.outBuffer = [];
  }
  /**
   * Returns the sample rate of the capturer.
   */
  sampleRate() {
    return this.context?.sampleRate;
  }

  private async startGraph(stream: MediaStream, timeslice: number, onEnded?: () => void) {
    this.outBuffer = [];
    this.context = new window.AudioContext({sampleRate: 16000});
    console.log(`MicManager sample rate: ${this.context.sampleRate}`);
    this.stream = stream;
    const workletSrcBlob = new Blob([AUDIO_WORKLET_SRC], {
      type: 'application/javascript',
    });
    const workletSrcUrl = URL.createObjectURL(workletSrcBlob);
    await this.context!.audioWorklet.addModule(workletSrcUrl);
    this.processorNode = new AudioWorkletNode(this.context, 'input-processor');
    this.processorNode.port.onmessage = (event) => {
      this.outBuffer!.push(event.data);
      const bufDuration = ((AUDIO_WORKLET_NUM_SAMPLES * this.outBuffer!.length) / this.sampleRate()!) * 1000;
      if (bufDuration >= timeslice) {
        const chunkEvent = new CustomEvent('chunk', {
          detail: this.makeAudioChunk(this.outBuffer!),
        });
        this.dispatchEvent(chunkEvent);
        this.outBuffer = [];
      }
      this.vad?.processFrame(event.data);
    };
    const source = this.context.createMediaStreamSource(stream);
    source.connect(this.processorNode);
    this.stream.getAudioTracks()[0].onended = () => {
      console.log('MicManager stream ended');
      this.stop();
      onEnded?.();
    };

    this.vad = await SileroVoiceActivityDetector.create(512);
    this.vad.onSpeechStart = () => {
      console.log('Speech start detected');
    };
    this.vad.onSpeechEnd = () => {
      console.log('Speech end detected');
    };
    this.vad.onSpeechCancel = () => {
      console.log('Speech cancel detected');
    };
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
 * The final flag indicates whether the service is still processing the
 * received audio.
 * The latency field is optional and indicates the time in milliseconds
 * between when VAD detected silence and the transcript was received.
 */
export class Transcript {
  constructor(public text: string, public final: boolean, public timestamp: number, public latency?: number) {}
}

/**
 * Base class for live speech recognizers that wraps a web socket
 * connection to a speech recognition server.
 * Override handleOpen/handleMessage/sendChunk to customize for a particular
 * speech recognition service.
 */
export abstract class SpeechRecognitionBase extends EventTarget {
  /** A wall time representing when the first chunk was sent. */
  private initialChunkMillis: number = 0;
  /** A relative time indicating how much audio data has been sent. */
  private streamSentMillis: number = 0;
  /** A relative time indicating how much audio data has been recognized. */
  protected streamRecognizedMillis: number = 0;
  private outBuffer: ArrayBuffer[] = [];
  protected socket?: WebSocket;

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
    this.socket.binaryType = 'arraybuffer';
    this.socket.onopen = (_event) => {
      const elapsed = performance.now() - startTime;
      console.log(`[${this.name}] socket opened, elapsed=${elapsed.toFixed(0)}`);
      this.handleOpen();
      this.flush();
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
      if (this.socket!.readyState == 1) {
        this.sendChunk(chunk);
        // Set our reference time for computing latency when sending our first unbuffered chunk.
        if (this.initialChunkMillis == 0) {
          this.initialChunkMillis = performance.now() - this.streamSentMillis;
        }
      } else if (this.socket!.readyState == 0) {
        // If the web socket isn't open yet, buffer the chunk.
        this.outBuffer.push(chunk);
      } else {
        console.error(`[${this.name}] socket closed`);
      }
      this.streamSentMillis += (chunk.byteLength / (2 * this.manager.sampleRate()!)) * 1000;
    });
  }
  private computeLatency(recognitionMillis: number) {
    if (!this.initialChunkMillis) {
      return;
    }
    return performance.now() - (this.initialChunkMillis + recognitionMillis);
  }
  protected dispatchTranscript(transcript: string, final: boolean, recognizedMillis: number) {
    if (!final && recognizedMillis < this.streamRecognizedMillis) {
      console.warn(`[${this.name}] recognition time ${recognizedMillis} < ${this.streamRecognizedMillis}, ignoring`);
      return;
    }
    const latency = this.computeLatency(recognizedMillis);
    const event = new CustomEvent('transcript', {
      detail: new Transcript(transcript, final, recognizedMillis, latency),
    });
    this.dispatchEvent(event);
    this.streamRecognizedMillis = recognizedMillis;
  }
  protected handleOpen() {}
  protected handleMessage(_result: any) {}
  protected sendChunk(chunk: ArrayBuffer) {
    this.socket!.send(chunk);
  }
  protected flush() {
    console.log(`[${this.name}] flushing ${this.outBuffer.length} chunks`);
    this.outBuffer.forEach((chunk) => this.sendChunk(chunk));
    this.outBuffer = [];
  }
  protected sendClose() {}
}

/**
 * Speech recognizer that uses the Deepgram service.
 */
export class DeepgramSpeechRecognition extends SpeechRecognitionBase {
  private buf: string;
  constructor(manager: MicManager, tokenFunc: GetToken, language?: string, model?: string) {
    super('deepgram', manager, tokenFunc, language, model);
    this.buf = '';
  }
  async start() {
    this.buf = '';
    const params = new URLSearchParams({
      tier: 'nova',
      model: this.model ?? 'general',
      version: 'latest',
      encoding: 'linear16',
      channels: '1',
      sample_rate: this.manager.sampleRate()!.toString(),
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
 * Speech recognizer that uses the Soniox service.
 */
export class SonioxSpeechRecognition extends SpeechRecognitionBase {
  private token?: string;
  constructor(manager: MicManager, tokenFunc: GetToken, language?: string) {
    super('soniox', manager, tokenFunc, language);
  }
  async start() {
    this.token = await this.fetchToken();
    super.startInternal('wss://api.soniox.com/transcribe-websocket');
  }
  protected handleOpen() {
    const obj = {
      api_key: this.token,
      sample_rate_hertz: this.manager.sampleRate(),
      include_nonfinal: true,
      enable_endpoint_detection: true,
      speech_context: null,
      model: this.language ? `${this.language.slice(0, 2)}_v2_lowlatency` : null,
    };
    this.socket!.send(JSON.stringify(obj));
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
    const append = (transcript: string, w: any) => {
      if (w.t == '<end>') {
        return transcript;
      }
      let out = transcript;
      if (out && !',.?!'.includes(w.t[0])) {
        out += ' ';
      }
      out += w.t;
      return out;
    };
    const partialTranscript = result.nfw.reduce(append, '');
    if (partialTranscript) {
      this.dispatchTranscript(partialTranscript, false, result.tpt);
    }
    const finalTranscript = result.fw.reduce(append, '');
    if (finalTranscript) {
      this.dispatchTranscript(finalTranscript, true, result.tpt);
    }
  }
  protected sendClose() {
    this.socket!.send('');
  }
}

/**
 * Speech recognizer that uses the Gladia service.
 */
export class GladiaSpeechRecognition extends SpeechRecognitionBase {
  private token?: string;
  constructor(manager: MicManager, tokenFunc: GetToken, language?: string) {
    super('gladia', manager, tokenFunc, language);
  }
  async start() {
    this.token = await this.fetchToken();
    super.startInternal('wss://api.gladia.io/audio/text/audio-transcription');
  }
  protected handleOpen() {
    const obj = {
      x_gladia_key: this.token,
      sample_rate: this.manager.sampleRate(),
      encoding: 'wav',
      // 300ms endpointing by default
      language: this.language?.slice(0, 2) == 'en' ? 'english' : null,
    };
    this.socket!.send(JSON.stringify(obj));
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
 * Speech recognizer that uses the AssemblyAI service.
 */
export class AssemblyAISpeechRecognition extends SpeechRecognitionBase {
  constructor(manager: MicManager, tokenFunc: GetToken, language?: string) {
    super('aai', manager, tokenFunc, language);
  }
  async start() {
    super.startInternal(
      `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${this.manager.sampleRate()}&token=${await this.fetchToken()}`
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
 * Speech recognizer that uses the Speechmatics service.
 */
export class SpeechmaticsSpeechRecognition extends SpeechRecognitionBase {
  private buf: string;
  constructor(manager: MicManager, tokenFunc: GetToken, language?: string) {
    super('speechmatics', manager, tokenFunc, language);
    this.buf = '';
  }
  async start() {
    const languageCode = this.language?.slice(0, 2) ?? 'en';
    super.startInternal(`wss://eu.rt.speechmatics.com/v2/${languageCode}?jwt=${await this.fetchToken()}`);
  }
  protected handleOpen() {
    this.buf = '';
    const obj = {
      message: 'StartRecognition',
      audio_format: {
        type: 'raw',
        encoding: 'pcm_s16le',
        sample_rate: this.manager.sampleRate(),
      },
      transcription_config: {
        language: this.language?.slice(0, 2) ?? 'en',
        enable_partials: true,
        max_delay: 2, // the minimum (seconds)
      },
    };
    this.socket!.send(JSON.stringify(obj));
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
      if (result.metadata.transcript) {
        this.dispatchTranscript(this.buf + result.metadata.transcript, false, result.metadata.end_time * 1000);
      }
    } else if (result.message == 'AddTranscript') {
      if (result.metadata.transcript) {
        if (!('is_eos' in result.results[0])) {
          this.buf += result.metadata.transcript;
        } else {
          this.dispatchTranscript(this.buf, true, result.metadata.end_time * 1000);
          this.buf = result.metadata.transcript;
        }
      }
    } else if (result.message != 'AudioAdded' && result.message != 'RecognitionStarted' && result.message != 'Info') {
      console.log(`speechmatics: unhandled message type: ${result.message}`);
    }
  }
}

/**
 * Speech recognizer that uses the Rev AI service.
 */
export class RevAISpeechRecognition extends SpeechRecognitionBase {
  constructor(manager: MicManager, tokenFunc: GetToken, language?: string) {
    super('revai', manager, tokenFunc, language);
  }
  async start() {
    const params = new URLSearchParams({
      access_token: await this.fetchToken(),
      content_type: `audio/x-raw;layout=interleaved;rate=${this.manager.sampleRate()};format=S16LE;channels=1`,
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
