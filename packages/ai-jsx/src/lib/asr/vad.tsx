// @ts-expect-error
//import { VAD } from 'node-vad';

export abstract class VoiceActivityDetectorBase {
  abstract start(sampleRate: number): void;
  // abstract pause(): void;
  abstract processFrame(frame: Float32Array): void;
  onSpeechStart?: () => void;
  onSpeechCancel?: () => void;
  onSpeechEnd?: () => void;
  onError?: () => void;
}
/*
export class NodeVoiceActivityDetector extends VoiceActivityDetectorBase {
  private vad: VAD;
  private inSpeech: boolean = false;
  constructor(private readonly sampleRate: number) {
    super();
  }
  start() {
    this.vad = new VAD(VAD.Mode.NORMAL);
  }
  async processFrame(frame: Float32Array) {
    const result = await this.vad.processAudioFloat(frame, this.sampleRate);
    switch (result) {
      case VAD.Event.VOICE:
        if (!this.inSpeech) {
          this.inSpeech = true;
          this.onSpeechStart?.();
        }
        break;
      case VAD.Event.NOISE:
      case VAD.Event.SILENCE:
        if (this.inSpeech) {
          this.inSpeech = false;
          this.onSpeechEnd?.();
        }
        break;
      case VAD.Event.ERROR:
        console.error('VAD error');
        this.onError?.();
        break;
    }
  }
}*/

// Voice activity detector Inspired by https://github.com/kdavis-mozilla/vad.js
type FilterShape = { f: number, v: number };
type VADOptions = {
  fftSize?: number,
  bufferLen?: number,
  voice_stop?: () => void,
  voice_start?: () => void,
  smoothingTimeConstant?: number,
  energy_offset?: number,
  energy_threshold_ratio_pos?: number,
  energy_threshold_ratio_neg?: number,
  energy_integration?: number,
  filter?: FilterShape[],
  source?: MediaStreamAudioSourceNode,
  context?: AudioContext
};

export class VAD {
  private options: VADOptions;
  private hertzPerBin: number;
  private iterationFrequency: number;
  private iterationPeriod: number;
  private filter: number[];
  private energy_ready: boolean;
  private vadState: boolean;
  private energy: number;
  private energy_offset: number;
  private energy_threshold_pos: number;
  private energy_threshold_neg: number;
  private voiceTrend: number;
  private voiceTrendMax: number;
  private voiceTrendMin: number;
  private voiceTrendStart: number;
  private voiceTrendEnd: number;
  private analyser: AnalyserNode;
  private floatFrequencyData: Float32Array;
  private floatFrequencyDataLinear: Float32Array;
  private scriptProcessorNode: ScriptProcessorNode;
  private logging: boolean;
  private log_i: number;
  private log_limit: number;

  constructor(options: VADOptions) {
    // Default options
    this.options = {
      fftSize: 512,
      bufferLen: 512,
      voice_stop: () => {},
      voice_start: () => {},
      smoothingTimeConstant: 0.99,
      energy_offset: 1e-8,
      energy_threshold_ratio_pos: 2,
      energy_threshold_ratio_neg: 0.5,
      energy_integration: 1,
      filter: [
        { f: 200, v: 0 },
        { f: 2000, v: 1 }
      ],
      source: null,
      context: null,
      ...options
    };

    if (!this.options.source) {
      throw new Error("The options must specify a MediaStreamAudioSourceNode.");
    }

    this.options.context = this.options.source.context;
    this.hertzPerBin = this.options.context.sampleRate / this.options.fftSize;
    this.iterationFrequency = this.options.context.sampleRate / this.options.bufferLen;
    this.iterationPeriod = 1 / this.iterationFrequency;

    // Initialize other properties
    // (Similar to the original function-based implementation)

    // ...
  }

  setFilter(shape: FilterShape[]): void {
    this.filter = [];
    for (let i = 0, iLen = this.options.fftSize / 2; i < iLen; i++) {
      this.filter[i] = 0;
      for (let j = 0, jLen = shape.length; j < jLen; j++) {
        if (i * this.hertzPerBin < shape[j].f) {
          this.filter[i] = shape[j].v;
          break;
        }
      }
    }
  }

  update(): void {
    const fft = this.floatFrequencyData;
    for (let i = 0, iLen = fft.length; i < iLen; i++) {
      this.floatFrequencyDataLinear[i] = Math.pow(10, fft[i] / 10);
    }
    this.energy_ready = false;
  }

  getEnergy(): number {
    if (this.energy_ready) {
      return this.energy;
    }

    let energy = 0;
    const fft = this.floatFrequencyDataLinear;
    for (let i = 0, iLen = fft.length; i < iLen; i++) {
      energy += this.filter[i] * fft[i] * fft[i];
    }

    this.energy = energy;
    this.energy_ready = true;
    return energy;
  }

  monitor(): number {
    const energy = this.getEnergy();
    const signal = energy - this.energy_offset;

    // ... (Similar logic as in the original function-based implementation)

    return signal;
  }

  // ... (Other methods like log, triggerLog can also be added)
}

}

