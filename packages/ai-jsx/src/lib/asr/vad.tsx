'use client';
import VADBuilder, { VAD, VADMode, VADEvent } from '@ozymandiasthegreat/vad';

export abstract class VoiceActivityDetectorBase {
  abstract start(sampleRate: number): void;
  abstract stop(): void;
  // abstract pause(): void;
  abstract processFrame(frame: Float32Array): void;
  onSpeechStart?: () => void;
  onSpeechCancel?: () => void;
  onSpeechEnd?: () => void;
  onError?: () => void;
}

export class LibfVoiceActivityDetector extends VoiceActivityDetectorBase {
  private VADClass?: typeof VAD;
  private vad?: VAD;
  private buffer: Int16Array = new Int16Array();
  private inSpeech: boolean = false;
  constructor(private readonly sampleRate: number) {
    super();
  }
  async start() {
    this.VADClass = await VADBuilder();
    this.vad = new this.VADClass(VADMode.VERY_AGGRESSIVE, this.sampleRate);
  }
  stop() {
    this.vad?.destroy();
    this.vad = undefined;
  }
  processFrame(frame: Float32Array) {
    const intFrame = this.VADClass!.floatTo16BitPCM(frame);
    const newBuffer = new Int16Array(this.buffer.length + intFrame.length);
    newBuffer.set(this.buffer);
    newBuffer.set(intFrame, this.buffer.length);
    const vadBuffer = newBuffer.subarray(0, this.vad!.getMinBufferSize());

    this.buffer = newBuffer;



    const result = this.vad!.processFrame(intFrame);
    switch (result) {
      case VADEvent.VOICE:
        if (!this.inSpeech) {
          this.inSpeech = true;
          this.onSpeechStart?.();
        }
        break;
      case VADEvent.SILENCE:
        if (this.inSpeech) {
          this.inSpeech = false;
          this.onSpeechEnd?.();
        }
        break;
      case VADEvent.ERROR:
        console.error('VAD error');
        this.onError?.();
        break;
    }
  }
}
