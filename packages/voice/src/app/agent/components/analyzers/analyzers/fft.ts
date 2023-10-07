/**
 * Some contents in this file are heavily inspired/adapted from audioMotion-analyzer
 * See https://github.com/hvianna/audioMotion-analyzer
 */

import { AnalyzerInputControl } from "./common";

export interface FreqBinInfo {
  binLo: number;
  binHi: number;
  freqLo: number;
  freqHi: number;
  ratioLo: number;
  ratioHi: number;
  value: number;
}

interface FreqBandInfo {
  freq: number;
  bin: number;
  ratio: number;
}

interface EnergyInfo {
  val: number;
  peak: number;
  hold: number;
}

export interface FreqRange {
  start: number;
  end: number;
}

export type EnergyMeasure =
  | "overall"
  | "peak"
  | "bass"
  | "lowMid"
  | "mid"
  | "highMid"
  | "treble";

// internal constants
const ROOT24 = 2 ** (1 / 24), // 24th root of 2
  C0 = 440 * ROOT24 ** -114; // ~16.35 Hz

export default class FFTAnalyzer implements AnalyzerInputControl {
  private _analyzer: AnalyserNode;
  private _input: GainNode;
  private _output: GainNode;
  public readonly _audioCtx: AudioContext;
  public readonly _sources: AudioNode[];
  private _outNodes: AudioDestinationNode[];
  private _fftData: Uint8Array;
  private _freqBinInfos: FreqBinInfo[] = [];
  public getBars(): FreqBinInfo[] {
    return this._freqBinInfos;
  }
  private _energy: EnergyInfo = { val: 0, peak: 0, hold: 0 };
  private readonly _minFreq: number = 20;
  private readonly _maxFreq: number = 22000;
  private _mode: number = 2;
  public get mode(): number {
    return this._mode;
  }
  public set mode(value: number) {
    this._mode = value;
    this._updateFreqBins();
  }
  public get volume() {
    return this._output.gain.value;
  }
  public set volume(value: number) {
    this._output.gain.value = value;
  }
  private _runId: number | undefined = undefined;
  private get isOn(): boolean {
    return this._runId !== undefined;
  }

  constructor(
    source: HTMLAudioElement,
    audioContext: AudioContext | undefined = undefined
  ) {
    if (audioContext === undefined) {
      this._audioCtx = new window.AudioContext();
    } else {
      this._audioCtx = audioContext;
    }

    if (!this._audioCtx.createGain) {
      throw new Error("Provided audio context is not valid");
    }

    // Routing
    // (source) -->  input  -->  analyzer  -->  output  --> (destination)
    this._analyzer = this._audioCtx.createAnalyser();
    this._input = this._audioCtx.createGain();
    this._output = this._audioCtx.createGain();

    this._sources = [];
    this.connectInput(this._audioCtx.createMediaElementSource(source));

    this._input.connect(this._analyzer);

    this._analyzer.connect(this._output);

    this._outNodes = [this._audioCtx.destination];
    this._output.connect(this._outNodes[0]);

    this._analyzer.smoothingTimeConstant = 0.5;
    this._analyzer.minDecibels = -85;
    this._analyzer.maxDecibels = -25;
    this._analyzer.fftSize = 8192;
    this._fftData = new Uint8Array(this._analyzer.frequencyBinCount);

    this._updateFreqBins();
    this.toggleAnalyzer(true);
  }

  private _updateFreqBins(): void {
    // Calculate the freq bin info
    const infos: FreqBinInfo[] = [];
    const binToFreq = (bin: number) =>
      (bin * this._audioCtx.sampleRate) / this._analyzer.fftSize || 1; // returns 1 for bin 0

    const barsPush = (
      binLo: number,
      binHi: number,
      freqLo: number,
      freqHi: number,
      ratioLo: number,
      ratioHi: number
    ) =>
      infos.push({
        binLo,
        binHi,
        freqLo,
        freqHi,
        ratioLo,
        ratioHi,
        value: 0,
      });

    // generate a 11-octave 24-tone equal tempered scale (16Hz to 33kHz)

    /*
        A simple linear interpolation is used to obtain an approximate amplitude value for the desired frequency
        from available FFT data, like so:

        h = hLo + ( hHi - hLo ) * ( f - fLo ) / ( fHi - fLo )
                                  \___________________________/
                                                |
                                              ratio
        where:

        f   - desired frequency
        h   - amplitude of desired frequency
        fLo - frequency represented by the lower FFT bin
        fHi - frequency represented by the higher FFT bin
        hLo - amplitude of fLo
        hHi - amplitude of fHi

        ratio is calculated in advance here, to reduce computational complexity during real-time rendering in the _draw() function
    */
    const temperedScale: FreqBandInfo[] = [];
    for (let octave = 0; octave < 11; octave++) {
      for (let note = 0; note < 24; note++) {
        const freq = C0 * ROOT24 ** (octave * 24 + note),
          bin = this._freqToBin(freq, false),
          binFreq = binToFreq(bin),
          nextFreq = binToFreq(bin + 1),
          ratio = (freq - binFreq) / (nextFreq - binFreq);

        temperedScale.push({ freq, bin, ratio });
      }
    }

    // generate the frequency bands according to current analyzer settings
    const steps = [0, 1, 2, 3, 4, 6, 8, 12, 24][this._mode]; // number of notes grouped per band for each mode
    for (let index = 0; index < temperedScale.length; index += steps) {
      let { freq: freqLo, bin: binLo, ratio: ratioLo } = temperedScale[index], // band start
        {
          freq: freqHi,
          bin: binHi,
          ratio: ratioHi,
        } = temperedScale[index + steps - 1]; // band end

      const nBars = infos.length,
        prevBar = infos[nBars - 1];

      // if the ending frequency is out of range, we're done here
      if (freqHi > this._maxFreq || binHi >= this._analyzer.fftSize / 2) {
        prevBar.binHi++; // add an extra bin to the last bar, to fully include the last valid band
        prevBar.ratioHi = 0; // disable interpolation
        prevBar.freqHi = binToFreq(prevBar.binHi); // update ending frequency
        break;
      }

      // is the starting frequency in the selected range?
      if (freqLo >= this._minFreq) {
        if (nBars > 0) {
          const diff = binLo - prevBar.binHi;

          // check if we skipped any available FFT bins since the last bar
          if (diff > 1) {
            // allocate half of the unused bins to the previous bar
            prevBar.binHi = binLo - (diff >> 1);
            prevBar.ratioHi = 0;
            prevBar.freqHi = binToFreq(prevBar.binHi); // update ending frequency

            // if the previous bar doesn't share any bins with other bars, no need for interpolation
            if (
              nBars > 1 &&
              prevBar.binHi > prevBar.binLo &&
              prevBar.binLo > infos[nBars - 2].binHi
            ) {
              prevBar.ratioLo = 0;
              prevBar.freqLo = binToFreq(prevBar.binLo); // update starting frequency
            }

            // start the current bar at the bin following the last allocated bin
            binLo = prevBar.binHi + 1;
          }

          // if the lower bin is not shared with the ending frequency nor the previous bar, no need to interpolate it
          if (binHi > binLo && binLo > prevBar.binHi) {
            ratioLo = 0;
            freqLo = binToFreq(binLo);
          }
        }

        barsPush(binLo, binHi, freqLo, freqHi, ratioLo, ratioHi);
      }
    }

    this._freqBinInfos = infos;
  }

  private _freqToBin(freq: number, round: boolean = true): number {
    const max = this._analyzer.frequencyBinCount - 1,
      bin = (round ? Math.round : Math.floor)(
        (freq * this._analyzer.fftSize) / this._audioCtx.sampleRate
      );

    return bin < max ? bin : max;
  }

  private _analyze(): void {
    const n = this._freqBinInfos.length;
    // get a new array of data from the FFT
    const fftData = this._fftData;
    this._analyzer.getByteFrequencyData(fftData);
    // helper function for FFT data interpolation
    const interpolate = (bin: number, ratio: number) =>
      fftData[bin] + (fftData[bin + 1] - fftData[bin]) * ratio;

    let currentEnergy = 0;
    for (let i = 0; i < n; i++) {
      const binInfo = this._freqBinInfos[i],
        { binLo, binHi, ratioLo, ratioHi } = binInfo;
      let v = Math.max(
        interpolate(binLo, ratioLo),
        interpolate(binHi, ratioHi)
      );
      // check additional bins (if any) for this bar and keep the highest value
      for (let j = binLo + 1; j < binHi; j++) {
        if (fftData[j] > v) {
          v = fftData[j];
        }
      }

      // Normalize
      v /= 255;
      // Note
      binInfo.value = v;
      currentEnergy += v;
    }

    // Update energy
    this._energy.val = currentEnergy / n;
    if (this._energy.val >= this._energy.peak) {
      this._energy.peak = this._energy.val;
      this._energy.hold = 30;
    } else {
      if (this._energy.hold > 0) this._energy.hold--;
      else if (this._energy.peak > 0)
        this._energy.peak *= (30 + this._energy.hold--) / 30; // decay (drops to zero in 30 frames)
    }

    // schedule next update
    this._runId = requestAnimationFrame((timestamp) => this._analyze());
  }

  public toggleAnalyzer(value: boolean | undefined = undefined): boolean {
    const started = this.isOn;
    if (value === undefined) {
      value = !started;
    }

    if (started && !value && this._runId !== undefined) {
      cancelAnimationFrame(this._runId);
    } else if (!started && value) {
      this._runId = requestAnimationFrame((timestamp) => this._analyze());
    }
    return this.isOn;
  }

  public getEnergy(freqRange: EnergyMeasure = "overall"): number {
    if (freqRange === "overall") {
      return this._energy.val;
    }
    if (freqRange == "peak") {
      return this._energy.peak;
    }
    const presets = {
      bass: [20, 250],
      lowMid: [250, 500],
      mid: [500, 2e3],
      highMid: [2e3, 4e3],
      treble: [4e3, 16e3],
    };

    const [startFreq, endFreq] = presets[freqRange];

    const startBin = this._freqToBin(startFreq),
      endBin = endFreq ? this._freqToBin(endFreq) : startBin;

    let energy = 0;
    for (let i = startBin; i <= endBin; i++) {
      energy += this._fftData[i];
    }

    return energy / (endBin - startBin + 1) / 1 / 255;
  }

  connectInput(source: AudioNode): void {
    if (!source.connect) {
      throw new Error("Audio source must be an instance of AudioNode");
    }

    if (!this._sources.includes(source)) {
      source.connect(this._input);
      this._sources.push(source);
    }
  }

  disconnectInputs(): void {
    for (const node of Array.from(this._sources)) {
      const idx = this._sources.indexOf(node);
      if (idx >= 0) {
        node.disconnect(this._input);
        this._sources.splice(idx, 1);
      }
    }
  }
}
