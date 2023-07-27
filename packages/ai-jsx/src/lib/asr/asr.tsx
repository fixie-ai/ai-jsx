'use client';

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

class EventTargetImpl implements EventTarget {
  listeners: Record<string, EventListener[]>;
  constructor() {
    this.listeners = {};
  }
  addEventListener(type: string, listener: EventListener) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }
  removeEventListener(type: string, listener: EventListener) {
    const index = this.listeners[type].indexOf(listener);
    if (index != -1) {
      this.listeners[type].splice(index, 1);
    }
  }
  dispatchEvent(e: CustomEvent) {
    this.listeners[e.type]?.forEach((listener) => listener(e));
    return true;
  }
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
export class MicManager extends EventTargetImpl {
  private outBuffer?: Float32Array[];
  private context?: AudioContext;
  private streamElement?: HTMLAudioElement;
  private stream?: MediaStream;
  private processorNode?: AudioWorkletNode;
  private numSilentFrames = 0;
  async startMic(timeslice: number) {
    this.startGraph(await navigator.mediaDevices.getUserMedia({ audio: true }), timeslice);
  }
  async startFile(url: string, timeslice: number) {
    const response = await fetch(url);
    const blob = await response.blob();
    this.streamElement = new Audio();
    this.streamElement.src = URL.createObjectURL(blob);
    await this.streamElement.play();
    const stream = await (this.streamElement as any).captureStream();
    await this.startGraph(stream, timeslice);
  }
  private async startGraph(stream: MediaStream, timeslice: number) {
    this.outBuffer = [];
    this.context = new window.AudioContext();
    this.stream = stream;
    const workletSrcBlob = new Blob([AUDIO_WORKLET_SRC], {
      type: 'application/javascript',
    });
    const workletSrcUrl = URL.createObjectURL(workletSrcBlob);
    await this.context!.audioWorklet.addModule(workletSrcUrl);
    this.processorNode = new AudioWorkletNode(this.context, 'input-processor');
    this.processorNode.port.onmessage = (event) => {
      this.outBuffer!.push(event.data);
      const bufDuration = ((128 * this.outBuffer!.length) / this.sampleRate()) * 1000;
      if (bufDuration >= timeslice) {
        const chunkEvent = new CustomEvent('chunk', {
          detail: this.makePcmChunk(this.outBuffer!),
        });
        this.dispatchEvent(chunkEvent);
        this.outBuffer = [];
      }
    };
    const source = this.context.createMediaStreamSource(stream);
    source.connect(this.processorNode);
    this.numSilentFrames = 0;
  }
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
  sampleRate() {
    return this.context?.sampleRate;
  }
  private makePcmChunk(buffers: Float32Array[]) {
    const byteLength = buffers.reduce((sum, buf) => sum + buf.length, 0) * 2;
    const pcmBuffer = new ArrayBuffer(byteLength);
    const view = new DataView(pcmBuffer);
    let index = 0;
    let energy = 0.0;
    buffers.forEach((buffer) => {
      buffer.forEach((sample) => {
        energy += sample * sample;
        const i16 = Math.max(-32768, Math.min(32767, Math.floor(sample * 32768)));
        view.setInt16(index, i16, true);
        index += 2;
      });
      this.updateVad(energy / (index / 2));
    });
    return pcmBuffer;
  }
  private updateVad(energy: number) {
    const dbfs = 10 * Math.log10(energy);
    if (dbfs < -50) {
      this.numSilentFrames++;
      if (this.numSilentFrames == 100) {
        this.dispatchEvent(new CustomEvent('vad', { detail: false }));
      }
    } else {
      if (this.numSilentFrames >= 100) {
        this.dispatchEvent(new CustomEvent('vad', { detail: true }));
      }
      this.numSilentFrames = 0;
    }
  }
}

/**
 * Base class for live speech recognizers that wraps a web socket
 * connection to a speech recognition server.
 * Override handleOpen/handleMessage/sendChunk to customize for a particular
 * speech recognition service.
 */
export class SpeechRecognitionBase extends EventTargetImpl {
  private lastUtteranceEndTime: number = 0;
  private outBuffer: ArrayBuffer[] = [];
  protected socket?: WebSocket;

  constructor(protected manager: MicManager, protected name: string, protected language?: string) {
    super();
  }

  close() {
    if (this.socket) {
      this.sendClose();
      this.socket.close();
    }
  }
  protected async fetchToken() {
    const response = await fetch('/asr/api', {
      method: 'POST',
      body: JSON.stringify({ provider: this.name }),
    });
    const json = await response.json();
    return json.token;
  }
  protected startInternal(url: string, protocols?: string[]) {
    const startTime = performance.now();
    console.log(`${this.name} socket connecting...`);
    this.outBuffer = [];
    this.socket = new WebSocket(url, protocols);
    this.socket.binaryType = 'arraybuffer';
    this.socket.onopen = (event) => {
      const elapsed = performance.now() - startTime;
      console.log(`${this.name} socket opened, elapsed=${elapsed.toFixed(0)}`);
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
    this.socket.onerror = (event) => {
      console.log(`${this.name} socket error`);
    };
    this.socket.onclose = (event) => {
      console.log(`${this.name} socket closed, code=${event.code} reason=${event.reason}`);
    };
    this.manager.addEventListener('chunk', (event: CustomEvent) => {
      if (this.socket!.readyState == 1) {
        this.sendChunk(event.detail);
      } else if (this.socket!.readyState == 0) {
        this.outBuffer.push(event.detail);
      } else {
        console.error(`${this.name} socket closed`);
      }
    });
    this.manager.addEventListener('vad', (event: CustomEvent) => {
      if (!event.detail) {
        this.lastUtteranceEndTime = performance.now();
      } else {
        this.lastUtteranceEndTime = 0;
      }
    });
  }
  protected dispatchTranscript(transcript: string, final: boolean) {
    let latency = null;
    if (final) {
      if (this.lastUtteranceEndTime == 0) {
        console.warn(`${this.name} final transcript while VAD is still active`);
      }
      latency = performance.now() - this.lastUtteranceEndTime;
    }
    const event = new CustomEvent('transcript', {
      detail: { transcript, final, latency },
    });
    this.dispatchEvent(event);
  }
  protected handleOpen() {}
  protected handleMessage(result) {}
  protected sendChunk(chunk: ArrayBuffer) {
    this.socket!.send(chunk);
  }
  protected flush() {
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
  constructor(manager: MicManager, language?: string) {
    super(manager, 'deepgram', language);
    this.buf = '';
  }
  async start() {
    this.buf = '';
    const params = new URLSearchParams({
      model: 'nova',
      version: 'latest',
      encoding: 'linear16',
      channels: '1',
      sample_rate: this.manager.sampleRate().toString(),
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
  protected handleMessage(result) {
    if (result.type == 'Results') {
      let transcript = this.buf ? `${this.buf} ` : '';
      transcript += result.channel.alternatives[0].transcript;
      if (transcript) {
        this.dispatchTranscript(transcript, result.is_final && result.speech_final);
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
  constructor(manager: MicManager, language?: string) {
    super(manager, 'soniox', language);
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
    };
    if (this.language) {
      obj['model'] = `${this.language.slice(0, 2)}_precision`;
    }
    this.socket!.send(JSON.stringify(obj));
  }
  protected handleMessage(result) {
    const append = (transcript: string, w) => {
      if (w.t == '<end>') {
        return transcript;
      }
      let temp = transcript;
      if (temp && ',.?!'.indexOf(w.t[0]) == -1) {
        temp += ' ';
      }
      temp += w.t;
      return temp;
    };
    const partialTranscript = result.nfw.reduce(append, '');
    //const tpt = result.tpt;
    //const rtt = time() - this.firstSampleTime - tpt / 1000;
    if (partialTranscript) {
      //console.log(`${time()}: ${transcript}, rtt=${rtt}`);
      this.dispatchTranscript(partialTranscript, false);
    }
    const finalTranscript = result.fw.reduce(append, '');
    if (finalTranscript) {
      this.dispatchTranscript(finalTranscript, true);
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
  constructor(manager: MicManager, language?: string) {
    super(manager, 'gladia', language);
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
    };
    if (this.language?.toLowerCase() == 'en-us') {
      obj['language'] = 'english';
    }
    this.socket!.send(JSON.stringify(obj));
  }
  protected handleMessage(result) {
    if (result.transcription) {
      //console.log(`${result.type}: ${result.transcription}`);
      this.dispatchTranscript(result.transcription, result.type == 'final');
    }
    if (result.error) {
      console.error(result);
    }
  }
  protected sendChunk(chunk: ArrayBuffer) {
    const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(chunk)));
    return this.socket!.send(JSON.stringify({ frames: base64 }));
  }
}

/**
 * Speech recognizer that uses the AssemblyAI service.
 */
export class AssemblyAISpeechRecognition extends SpeechRecognitionBase {
  constructor(manager: MicManager, language?: string) {
    super(manager, 'aai', language);
  }
  async start() {
    super.startInternal(
      `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${this.manager.sampleRate()}&token=${await this.fetchToken()}`
    );
  }
  protected handleMessage(result) {
    if (result.text) {
      this.dispatchTranscript(result.text, result.message_type == 'FinalTranscript');
    }
  }
  protected sendChunk(chunk: ArrayBuffer) {
    const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(chunk)));
    this.socket!.send(JSON.stringify({ audio_data: base64 }));
  }
  protected sendClose() {
    this.socket!.send(JSON.stringify({ terminate_session: true }));
  }
}

/**
 * Creates a speech recoginzer of the given type (e.g., 'deepgram').
 */
export class SpeechRecognitionFactory {
  static create(type: string, manager: MicManager, language?: string) {
    switch (type) {
      case 'deepgram':
        return new DeepgramSpeechRecognition(manager, language);
      case 'soniox':
        return new SonioxSpeechRecognition(manager, language);
      case 'gladia':
        return new GladiaSpeechRecognition(manager, language);
      case 'aai':
        return new AssemblyAISpeechRecognition(manager, language);
      default:
        throw new Error(`Unknown speech recognition type: ${type}`);
    }
  }
}
