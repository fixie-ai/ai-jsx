export const TWO_PI = 2 * Math.PI;
/**
 * "Hypotenuse" for the quadrant of a unit square.
 */
export const HALF_DIAGONAL_UNIT_SQUARE = Math.hypot(0.5, 0.5);
/**
 * "Hypotenuse" for the quadrant of a unit cube.
 */
export const HALF_DIAGONAL_UNIT_CUBE = Math.hypot(0.5, 0.5, 0.5);

/**
 * Generates random numbers from a normalized gaussian distribution.
 * @returns - a random normalized value from a gaussian distribution.
 */
export const gaussianRandom = (): number => {
  let u = 0,
    v = 0;
  while (u === 0) {
    u = Math.random(); //Converting [0,1) to (0,1)
  }
  while (v === 0) {
    v = Math.random();
  }
  const num =
    (Math.sqrt(-2.0 * Math.log(u)) * Math.cos(TWO_PI * v)) / 10.0 + 0.5; // Translate to 0 -> 1
  if (num > 1 || num < 0) {
    return gaussianRandom(); // resample between 0 and 1
  }
  return num;
};

export const normalizedToRange = (
  vNorm: number,
  a: number,
  b: number
): number => {
  return Math.min(a, b) + vNorm * Math.abs(b - a);
};

/**
 * For a point in 3D space, calculate the radial offset value from the center of the nearest face of a unit cube.
 * @param xNorm - The normalized x coordinate in 3D space. Range [0,1] inclusive.
 * @param yNorm - The normalized y coordinate in 3D space. Range [0,1] inclusive.
 * @param zNorm - The normalized z coordinate in 3D space. Range [0,1] inclusive.
 * @param interiorValue - The value to return for any interior coordinates which do NOT reside on the faces of a unit cube.
 * @returns - the radial offset value.
 */
export const cubeFaceCenterRadialOffset = (
  xNorm: number,
  yNorm: number,
  zNorm: number,
  interiorValue: number = 1.0
): number => {
  // calculate a radial offset for each face
  // (ie: treat each face as a grid and calculate radial dist from center of grid)
  // Exterior:
  if (xNorm == 0 || xNorm == 1) {
    return Math.hypot(yNorm - 0.5, zNorm - 0.5) / HALF_DIAGONAL_UNIT_SQUARE;
  }
  if (yNorm == 0 || yNorm == 1) {
    return Math.hypot(xNorm - 0.5, xNorm - 0.5) / HALF_DIAGONAL_UNIT_SQUARE;
  }
  if (zNorm == 0 || zNorm == 1) {
    return Math.hypot(xNorm - 0.5, yNorm - 0.5) / HALF_DIAGONAL_UNIT_SQUARE;
  }
  // interior
  return interiorValue;
};

/**
 * Describes a coordinate type.
 */
export const COORDINATE_TYPE = {
  CARTESIAN_1D: "Cartesian_1D",
  CARTESIAN_2D: "Cartesian_2D",
  CARTESIAN_3D: "Cartesian_3D",
  CARTESIAN_CUBE_FACES: "Cartesian_CubeFaces",
  POLAR: "Polar",
} as const;

type ObjectValues<T> = T[keyof T];
export type CoordinateType = ObjectValues<typeof COORDINATE_TYPE>;

/**
 * Maps normalized input coordinates to scalar output values.
 */
export interface ICoordinateMapper {
  /**
   * The max amplitude of the scaled output values.
   */
  amplitude: number;

  /**
   * Maps a normalized input coordinate to a scalar value.
   * @param inputCoordinateType - The type of input coordinate.
   * @param xNorm - A normalized value representing the 1st dimension of the input coordinate. Range [0,1] inclusive.
   * @param yNorm - A normalized value representing the 2nd dimension of the input coordinate. Range [0,1] inclusive. Ignored if NOT applicable.
   * @param zNorm - A normalized value representing the 3rd dimension of the input coordinate. Range [0,1] inclusive. Ignored if NOT applicable.
   * @param elapsedTimeSec - The elapsedTimeSec since the program started. Used for mapping implementations which are time dependent. Ignored if NOT applicable.
   * @returns - A scalar value corresponding to the input coordinate.
   */
  map: (
    inputCoordinateType: CoordinateType,
    xNorm: number,
    yNorm?: number,
    zNorm?: number,
    elapsedTimeSec?: number
  ) => number;
}

/**
 * A base class for coordinate mapper implementations.
 */
export abstract class CoordinateMapperBase implements ICoordinateMapper {
  public readonly amplitude: number;

  /**
   *
   * @param amplitude - The max amplitude of the scaled output.
   */
  constructor(amplitude: number = 1.0) {
    this.amplitude = amplitude;
  }

  public map(
    inputCoordinateType: CoordinateType,
    xNorm: number,
    yNorm: number = 0.0,
    zNorm: number = 0.0,
    elapsedTimeSec: number = 0.0
  ): number {
    switch (inputCoordinateType) {
      case COORDINATE_TYPE.CARTESIAN_1D:
        return this.map_1D(xNorm, elapsedTimeSec);
      case COORDINATE_TYPE.CARTESIAN_2D:
      case COORDINATE_TYPE.POLAR:
        return this.map_2D(xNorm, yNorm, elapsedTimeSec);
      case COORDINATE_TYPE.CARTESIAN_3D:
        return this.map_3D(xNorm, yNorm, zNorm, elapsedTimeSec);
      case COORDINATE_TYPE.CARTESIAN_CUBE_FACES:
        return this.map_3DFaces(xNorm, yNorm, zNorm, elapsedTimeSec);
      default:
        throw Error(`Unsupported coordinate type: ${inputCoordinateType}`);
    }
  }

  abstract map_1D(xNorm: number, elapsedTimeSec?: number): number;
  abstract map_2D(
    xNorm: number,
    yNorm: number,
    elapsedTimeSec?: number
  ): number;
  abstract map_3D(
    xNorm: number,
    yNorm: number,
    zNorm: number,
    elapsedTimeSec?: number
  ): number;
  abstract map_3DFaces(
    xNorm: number,
    yNorm: number,
    zNorm: number,
    elapsedTimeSec?: number
  ): number;
}
