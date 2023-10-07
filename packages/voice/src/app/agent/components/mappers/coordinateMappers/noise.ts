import {
  createNoise2D,
  createNoise3D,
  createNoise4D,
  NoiseFunction2D,
  NoiseFunction3D,
  NoiseFunction4D,
} from "simplex-noise";
import { CoordinateMapperBase, cubeFaceCenterRadialOffset } from "./common";

/**
 * Maps input coordinates to output values based on the noise functions.
 */
export class CoordinateMapper_Noise extends CoordinateMapperBase {
  private readonly noise2D: NoiseFunction2D;
  private readonly noise3D: NoiseFunction3D;
  private readonly noise4D: NoiseFunction4D;
  private readonly spatialScale: number;
  private readonly timeScale: number;
  private readonly nIterations: number;
  private readonly persistence: number;

  /**
   *
   * @param amplitude - the maximum amplitude of the scaled output.
   */
  constructor(
    amplitude: number = 1.0,
    spatialScale: number = 1.0,
    timeScale: number = 1.0,
    nIterations: number = 1,
    persistence: number = 0.5
  ) {
    super(amplitude);
    this.spatialScale = spatialScale;
    this.timeScale = timeScale;
    this.nIterations = nIterations;
    this.persistence = persistence;
    this.noise2D = createNoise2D();
    this.noise3D = createNoise3D();
    this.noise4D = createNoise4D();
  }

  public map_1D(xNorm: number, elapsedTimeSec: number = 0.0): number {
    let noise = 0,
      maxAmp = 0,
      amp = this.amplitude,
      spatialScale = this.spatialScale,
      timeScale = this.timeScale;

    for (let i = 0; i < this.nIterations; i++) {
      noise +=
        amp * this.noise2D(xNorm * spatialScale, elapsedTimeSec * timeScale);
      maxAmp += amp;
      amp *= this.persistence;
      spatialScale *= 2;
    }

    return this.nIterations > 1 ? noise / maxAmp : noise;
  }

  public map_2D(
    xNorm: number,
    yNorm: number,
    elapsedTimeSec: number = 0.0
  ): number {
    let noise = 0,
      maxAmp = 0,
      amp = this.amplitude,
      spatialScale = this.spatialScale,
      timeScale = this.timeScale;

    for (let i = 0; i < this.nIterations; i++) {
      noise +=
        amp *
        this.noise3D(
          xNorm * spatialScale,
          yNorm * spatialScale,
          elapsedTimeSec * timeScale
        );
      maxAmp += amp;
      amp *= this.persistence;
      spatialScale *= 2;
    }

    return this.nIterations > 1 ? noise / maxAmp : noise;
  }

  public map_3D(
    xNorm: number,
    yNorm: number,
    zNorm: number,
    elapsedTimeSec: number = 0.0
  ): number {
    let noise = 0,
      maxAmp = 0,
      amp = this.amplitude,
      spatialScale = this.spatialScale,
      timeScale = this.timeScale;

    for (let i = 0; i < this.nIterations; i++) {
      noise +=
        amp *
        this.noise4D(
          xNorm * spatialScale,
          yNorm * spatialScale,
          zNorm * spatialScale,
          elapsedTimeSec * timeScale
        );
      maxAmp += amp;
      amp *= this.persistence;
      spatialScale *= 2;
    }

    return this.nIterations > 1 ? noise / maxAmp : noise;
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
    return this.map_1D(normRadialOffset, elapsedTimeSec);
  }
}
