import { createNoise3D, NoiseFunction3D } from "simplex-noise";
import { Vector3 } from "three";
import { IMotionMapper } from "./common";

/**
 * Maps input coordinates to output values based on the noise functions.
 */
export class MotionMapper_Noise implements IMotionMapper {
  private readonly noise3D: NoiseFunction3D;
  private readonly spatialScale: number;
  private readonly curlAmount: number;
  // private readonly timeScale: number;
  private readonly tmpVelocity: Vector3;

  /**
   *
   * @param amplitude - the maximum amplitude of the scaled output.
   */
  constructor(
    spatialScale: number = 1.0,
    curlAmount: number = 0.5
    // timeScale: number = 1.0
  ) {
    this.spatialScale = spatialScale;
    // this.timeScale = timeScale;
    this.curlAmount = curlAmount;
    this.noise3D = createNoise3D();
    this.tmpVelocity = new Vector3();
  }

  private computeCurl(vec: Vector3, x: number, y: number, z: number): void {
    const eps = 0.001;
    let n1, n2, a, b;

    // Find rate of change in each plane (avg to find approx derivative)
    // YZ plane
    n1 = this.noise3D(x, y + eps, z);
    n2 = this.noise3D(x, y - eps, z);
    a = (n1 - n2) / (2 * eps);
    n1 = this.noise3D(x, y, z + eps);
    n2 = this.noise3D(x, y, z - eps);
    b = (n1 - n2) / (2 * eps);
    vec.x = a - b;

    // ZX plane
    n1 = this.noise3D(x, y, z + eps);
    n2 = this.noise3D(x, y, z - eps);
    a = (n1 - n2) / (2 * eps);
    n1 = this.noise3D(x + eps, y, z);
    n2 = this.noise3D(x - eps, y, z);
    b = (n1 - n2) / (2 * eps);
    vec.y = a - b;

    // XY plane
    n1 = this.noise3D(x + eps, y, z);
    n2 = this.noise3D(x - eps, y, z);
    a = (n1 - n2) / (2 * eps);
    n1 = this.noise3D(x, y + eps, z);
    n2 = this.noise3D(x, y - eps, z);
    b = (n1 - n2) / (2 * eps);
    vec.z = a - b;

    vec.normalize();
  }

  public map(
    position: Vector3,
    deltaTimeSec: number,
    elapsedTimeSec: number,
    output: Vector3 = new Vector3()
  ): Vector3 {
    this.computeCurl(
      this.tmpVelocity,
      this.spatialScale * position.x,
      this.spatialScale * position.y,
      this.spatialScale * position.z
    );
    this.tmpVelocity.multiplyScalar(this.curlAmount * deltaTimeSec);
    output.copy(position);
    output.add(this.tmpVelocity);
    return output;
  }
}
