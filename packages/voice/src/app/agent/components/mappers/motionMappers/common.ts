import { Vector3 } from "three";

/**
 * Maps input positions to output positions.
 */
export interface IMotionMapper {
  /**
   * Maps a position vector to a next position.
   * @param position - The input position.
   * @param deltaTimeSec - The delta since the previous step.
   * @param elapsedTimeSec - The elapsedTimeSec since the program started. Used for mapping implementations which are time dependent. Ignored if NOT applicable.
   * @param output - The output vector, passed by ref.
   * @returns - A new position.
   */
  map: (
    position: Vector3,
    deltaTimeSec: number,
    elapsedTimeSec: number,
    output?: Vector3
  ) => Vector3;
}
