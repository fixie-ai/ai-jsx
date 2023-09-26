'use client';
import VADBuilder, { VAD, VADMode, VADEvent } from '@ozymandiasthegreat/vad';

/**
 * Base class for voice activity detectors.
 */
export abstract class VoiceActivityDetectorBase {
  /**
   * Starts the voice activity detector.
   */
  abstract start(): void;
  /**
   * Stop the voice activity detector.
   */
  abstract stop(): void;
  /**
   * Returns true if the voice activity detector is currently detecting voice.
   */
  abstract get isVoiceActive(): boolean;
  /**
   * Process a frame of audio.
   */
  abstract processFrame(frame: Float32Array): void;
  /**
   * Called when voice is detected.
   */
  onVoiceStart?: () => void;
  /**
   * Called when voice is no longer detected.
   */
  onVoiceEnd?: () => void;
  /**
   * Called when an error occurs.
   */
  onError?: () => void;
}

/**
 * The WebRTC GMM-based voice activity detector, ported to WASM.
 * Note that this VAD has a habit of producing false positives,
 * but this is unsurprising given that in most VAD applications
 * (e.g., silence suppression) false positives are harmless and false
 * negatives are really bad.
 *
 * Using the shortest supported frame size (10ms) seems to help
 * reduce false positives, and is better for latency anyway.
 */
export class LibfVoiceActivityDetector extends VoiceActivityDetectorBase {
  private readonly minSamples = 160; // 10ms at 16kHz
  private VADClass?: typeof VAD;
  private vad?: VAD;
  private buffer: Int16Array = new Int16Array(0);
  private voiceActive: boolean = false;
  constructor(private readonly sampleRate: number) {
    super();
  }
  async start() {
    this.VADClass = await VADBuilder();
    this.vad = new this.VADClass(VADMode.NORMAL, this.sampleRate);
    this.buffer = new Int16Array(0);
    this.voiceActive = false;
  }
  stop() {
    this.vad?.destroy();
    this.vad = undefined;
    this.VADClass = undefined;
  }
  get isVoiceActive() {
    return this.voiceActive;
  }
  processFrame(frame: Float32Array) {
    if (!this.vad) {
      return;
    }

    // The VAD library requires 16-bit PCM input, so we convert from float.
    const intFrame = this.VADClass!.floatTo16BitPCM(frame);

    // If we don't have enough samples to hit the minimum, just add to our buffer.
    const newBufferSize = this.buffer.length + intFrame.length;
    if (newBufferSize < this.minSamples) {
      const newBuffer = new Int16Array(newBufferSize);
      newBuffer.set(this.buffer);
      newBuffer.set(intFrame, this.buffer.length);
      this.buffer = newBuffer;
      return;
    }

    // The VAD library expects a frame of 160, 320, or 480 samples, and this
    // frame must be backed by a buffer of the exact size. So we build that
    // buffer, and then hang on to the remainder.
    const vadFrame = new Int16Array(new ArrayBuffer(this.minSamples * 2));
    vadFrame.set(this.buffer);
    vadFrame.set(intFrame.subarray(0, this.minSamples - this.buffer.length), this.buffer.length);
    this.buffer = intFrame.subarray(this.minSamples - this.buffer.length);

    const result = this.vad!.processFrame(vadFrame);
    switch (result) {
      case VADEvent.VOICE:
        if (!this.voiceActive) {
          this.voiceActive = true;
          this.onVoiceStart?.();
        }
        break;
      case VADEvent.SILENCE:
        if (this.voiceActive) {
          this.voiceActive = false;
          this.onVoiceEnd?.();
        }
        break;
      case VADEvent.ERROR:
        console.error('VAD error');
        this.onError?.();
        break;
    }
  }
}
