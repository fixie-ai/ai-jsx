import {
  CoordinateMapperBase,
  cubeFaceCenterRadialOffset,
  HALF_DIAGONAL_UNIT_CUBE,
  HALF_DIAGONAL_UNIT_SQUARE,
} from "./common";

/**
 * Maps input coordinates to output values based on pre-existing 1D data.
 * Supports interpolation and anti-aliasing.
 */
export class CoordinateMapper_Data extends CoordinateMapperBase {
  public data: Float32Array;

  /**
   *
   * @param amplitude - the maximum amplitude of the scaled output.
   * @param data - the pre-existing 1D data from which to interpolate values.
   */
  constructor(amplitude: number = 1.0, data: Float32Array) {
    super(amplitude);
    this.data = data;
  }

  private interpolateValueForNormalizedCoord(normalizedCoord: number): number {
    if (this.data === undefined || !this.data || this.data.length === 0) {
      return 0;
    }
    // Interpolate from the bar values based on the normalized Coord
    let rawIdx = normalizedCoord * (this.data.length - 1);
    let valueBelow = this.data[Math.floor(rawIdx)];
    let valueAbove = this.data[Math.ceil(rawIdx)];
    return valueBelow + (rawIdx % 1) * (valueAbove - valueBelow);
  }

  public map_1D(xNorm: number, elapsedTimeSec: number = 0.0): number {
    return this.amplitude * this.interpolateValueForNormalizedCoord(xNorm);
  }

  public map_2D(
    xNorm: number,
    yNorm: number,
    elapsedTimeSec: number = 0.0
  ): number {
    const normRadialOffset =
      Math.hypot(xNorm - 0.5, yNorm - 0.5) / HALF_DIAGONAL_UNIT_SQUARE;
    return this.map_1D(normRadialOffset, elapsedTimeSec);
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
    return this.map_1D(normRadialOffset, elapsedTimeSec);
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
