// @ts-expect-error
import { VAD } from 'node-vad';
export module fs {
};

export abstract class VoiceActivityDetectorBase {
  abstract start(sampleRate: number): void;
  // abstract pause(): void;
  abstract processFrame(frame: Float32Array): void;
  onSpeechStart?: () => void;
  onSpeechCancel?: () => void;
  onSpeechEnd?: () => void;
  onError?: () => void;
}

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
}
