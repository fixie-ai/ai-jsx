import { AnalyzerInputControl } from "./common";

function createBufferCopy(context: AudioContext, buffer: Float32Array) {
  let copyNode = context.createScriptProcessor(buffer.length, 1, 1);
  copyNode.onaudioprocess = (e) => {
    e.inputBuffer.copyFromChannel(buffer, 0);
  };
  return copyNode;
}

function createHilbertFilter(
  context: AudioContext,
  filterLength: number
): [DelayNode, ConvolverNode] {
  if (filterLength % 2 === 0) {
    filterLength -= 1;
  }
  const impulse = new Float32Array(filterLength);

  const mid = ((filterLength - 1) / 2) | 0;

  for (let i = 0; i <= mid; i++) {
    // hamming window
    const k = 0.53836 + 0.46164 * Math.cos((i * Math.PI) / (mid + 1));
    if (i % 2 === 1) {
      const im = 2 / Math.PI / i;
      impulse[mid + i] = k * im;
      impulse[mid - i] = k * -im;
    }
  }

  const impulseBuffer = context.createBuffer(
    2,
    filterLength,
    context.sampleRate
  );
  impulseBuffer.copyToChannel(impulse, 0);
  impulseBuffer.copyToChannel(impulse, 1);
  const hilbert = context.createConvolver();
  hilbert.normalize = false;
  hilbert.buffer = impulseBuffer;

  const delayTime = mid / context.sampleRate;
  const delay = context.createDelay(delayTime);
  delay.delayTime.value = delayTime;

  return [delay, hilbert];
}

export default class ScopeAnalyzer implements AnalyzerInputControl {
  public readonly _audioCtx: AudioContext;
  public readonly timeSamples: Float32Array;
  public readonly quadSamples: Float32Array;
  private _sources: AudioNode[];
  private _inputs: AudioNode[];
  public volume: number = 1.0;

  constructor(
    source: HTMLAudioElement,
    audioContext: AudioContext | undefined = undefined,
    n: number = 512,
    fftSize: number = 1024
  ) {
    if (audioContext === undefined) {
      this._audioCtx = new window.AudioContext();
    } else {
      this._audioCtx = audioContext;
    }
    this.timeSamples = new Float32Array(n);
    this.quadSamples = new Float32Array(n);
    const [delay, hilbert] = createHilbertFilter(this._audioCtx, fftSize - n);
    this._inputs = [delay, hilbert];
    const time = createBufferCopy(this._audioCtx, this.timeSamples);
    const quad = createBufferCopy(this._audioCtx, this.quadSamples);

    // Routing
    // (source) -->  hilbert --> time --> (destination)
    //          -->  delay   --> quad --> (destination)
    //          --> (destination)
    const sourceNode = this._audioCtx.createMediaElementSource(source);
    this._sources = [];
    this.connectInput(sourceNode);
    hilbert.connect(time);
    delay.connect(quad);
    time.connect(this._audioCtx.destination);
    quad.connect(this._audioCtx.destination);
    sourceNode.connect(this._audioCtx.destination);
  }

  disconnectInputs(): void {
    for (const node of Array.from(this._sources)) {
      const idx = this._sources.indexOf(node);
      if (idx >= 0) {
        for (const inputNode of this._inputs) {
          node.disconnect(inputNode);
        }
        this._sources.splice(idx, 1);
      }
    }
  }

  connectInput(source: AudioNode): void {
    if (!source.connect) {
      throw new Error("Audio source must be an instance of AudioNode");
    }

    if (!this._sources.includes(source)) {
      for (const input of this._inputs) {
        source.connect(input);
      }
      this._sources.push(source);
    }
  }
}
