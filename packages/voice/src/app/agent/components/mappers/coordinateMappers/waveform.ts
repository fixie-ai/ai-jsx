import {
  CoordinateMapperBase,
  CoordinateType,
  cubeFaceCenterRadialOffset,
  HALF_DIAGONAL_UNIT_CUBE,
  HALF_DIAGONAL_UNIT_SQUARE,
  ICoordinateMapper,
  TWO_PI,
} from "./common";

/**
 * Maps input coordinates to output values based on a time varying waveform.
 */
export class CoordinateMapper_Waveform extends CoordinateMapperBase {
  protected periodSec: number;
  protected b: number;

  /**
   *
   * @param amplitude - the maximum amplitude of the scaled output
   * @param frequencyHz - the frequency of the time varying waveform in hz
   */
  constructor(amplitude: number = 1.0, frequencyHz: number) {
    super(amplitude);
    this.periodSec = 1 / frequencyHz;
    this.b = TWO_PI / this.periodSec;
  }

  public map_1D(xNorm: number, elapsedTimeSec: number = 0.0): number {
    return this.amplitude * Math.sin(this.b * xNorm + elapsedTimeSec);
  }

  public map_2D(
    xNorm: number,
    yNorm: number,
    elapsedTimeSec: number = 0.0
  ): number {
    const normRadialOffset =
      Math.hypot(xNorm - 0.5, yNorm - 0.5) / HALF_DIAGONAL_UNIT_SQUARE;
    return (
      this.amplitude * Math.sin(this.b * normRadialOffset + elapsedTimeSec)
    );
  }

  public map_3D(
    xNorm: number,
    yNorm: number,
    zNorm: number,
    elapsedTimeSec: number = 0.0
  ): number {
    const normRadialOffset =
      Math.hypot(xNorm - 0.5, yNorm - 0.5, zNorm - 0.5) /
      HALF_DIAGONAL_UNIT_CUBE;
    return (
      this.amplitude * Math.sin(this.b * normRadialOffset + elapsedTimeSec)
    );
  }

  public map_3DFaces(
    xNorm: number,
    yNorm: number,
    zNorm: number,
    elapsedTimeSec: number = 0.0
  ): number {
    const normRadialOffset = cubeFaceCenterRadialOffset(
      xNorm,
      yNorm,
      zNorm,
      1.0
    );
    return (
      this.amplitude * Math.sin(this.b * normRadialOffset + elapsedTimeSec)
    );
  }
}

/**
 * Maps input coordinates to output values based on the superposition of multiple time varying waveforms.
 */
export class CoordinateMapper_WaveformSuperposition
  implements ICoordinateMapper
{
  private mappers: CoordinateMapper_Waveform[];
  public readonly amplitude: number;

  /**
   * @param waveformFrequenciesHz - the frequency (in hz) for each of the time varying waveforms
   * @param maxAmplitude - the maximum amplitude of the scaled output (after superposition)
   * @param amplitudeSplitRatio - the recursive split ratio controlling how amplitude is divided among the various waveforms
   */
  constructor(
    waveformFrequenciesHz: number[],
    maxAmplitude: number = 1.0,
    amplitudeSplitRatio: number = 0.75
  ) {
    this.amplitude = maxAmplitude;
    this.mappers = [];
    for (let i = 0; i < waveformFrequenciesHz.length; i++) {
      // Split the total amplitude among the various waves
      const amplitude =
        i >= waveformFrequenciesHz.length - 1
          ? maxAmplitude
          : amplitudeSplitRatio * maxAmplitude;
      maxAmplitude -= amplitude;

      this.mappers.push(
        new CoordinateMapper_Waveform(amplitude, waveformFrequenciesHz[i])
      );
    }
  }

  public map(
    inputCoordinateType: CoordinateType,
    xNorm: number,
    yNorm: number = 0.0,
    zNorm: number = 0.0,
    elapsedTimeSec: number = 0.0
  ): number {
    let superposition = 0;
    for (const mapper of this.mappers) {
      superposition += mapper.map(
        inputCoordinateType,
        xNorm,
        yNorm,
        zNorm,
        elapsedTimeSec
      );
    }
    return superposition;
  }
}
