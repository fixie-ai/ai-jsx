//import { FrameProcessor, RealTimeVADOptions, defaultRealTimeVADOptions, Message } from '@ricky0123/vad-web';
//import {Silero} from '@ricky0123/vad-web/dist/_common/models.js';
import * as ort from 'onnxruntime-web';
let vadModule;
let FrameProcessor: any;
let defaultRealTimeVADOptions: any;
let Message: any;
let Silero: any;

export abstract class VoiceActivityDetectorBase {
  abstract start(): void;
  // abstract pause(): void;
  abstract processFrame(frame: Float32Array): Promise<void>;
  onSpeechStart?: () => void;
  onSpeechCancel?: () => void;
  onSpeechEnd?: () => void;
}

export class SileroVoiceActivityDetector extends VoiceActivityDetectorBase {
  private frameBuffer: Float32Array = new Float32Array();
  private frameSamples: number = 0;
  private frameProcessor?: any;//FrameProcessor;

  static async create(frameSamples: number) {
    if (typeof window !== 'undefined') {
      vadModule = await import('@ricky0123/vad-web');
      FrameProcessor = vadModule.FrameProcessor;
      defaultRealTimeVADOptions = vadModule.defaultRealTimeVADOptions;
      Message = vadModule.Message;
      Silero = await import('@ricky0123/vad-web/dist/_common/models.js').then(m => m.Silero);
    }
    const options = {
      ...defaultRealTimeVADOptions,
      frameSamples,
    };
    const vad = new SileroVoiceActivityDetector();
    vad.frameSamples = frameSamples;
    await vad.init(options);
    return vad;
  }
  async init(options : any) {
    const model = await Silero.new(ort, this.fetchModel);
    this.frameProcessor = new FrameProcessor(model.process, model.reset_state, {
      frameSamples: options.frameSamples,
      positiveSpeechThreshold: options.positiveSpeechThreshold,
      negativeSpeechThreshold: options.negativeSpeechThreshold,
      redemptionFrames: options.redemptionFrames,
      preSpeechPadFrames: options.preSpeechPadFrames,
      minSpeechFrames: options.minSpeechFrames,
    });
  }

  start() { this.frameProcessor!.resume(); }
  pause() { this.frameProcessor!.pause(); }
  async processFrame(frame: Float32Array) {
    this.appendFrame(frame);
    if (this.frameBuffer!.length < this.frameSamples) {
      return;
    }

    const buffer = this.frameBuffer;
    this.frameBuffer = new Float32Array();
    const { msg } = await this.frameProcessor!.process(buffer);
    switch (msg) {
      case Message.SpeechStart:
        this.onSpeechStart?.();
        break;
      case Message.VADMisfire:
        this.onSpeechCancel?.();
        break;
      case Message.SpeechEnd:
        this.onSpeechEnd?.();
        break;
      default:
        console.log(`Unknown message: ${msg}`);
        break;
    }
  }

  private async fetchModel() {
    const modelUrl = 'models/silero_vad.onnx';
    const response = await fetch(modelUrl);
    return response.arrayBuffer();
  }
  private appendFrame(frame: Float32Array) {
    const newBuffer = new Float32Array(this.frameBuffer.length + frame.length);
    newBuffer.set(this.frameBuffer);
    newBuffer.set(frame, this.frameBuffer.length);
    this.frameBuffer = newBuffer;
  }
}
