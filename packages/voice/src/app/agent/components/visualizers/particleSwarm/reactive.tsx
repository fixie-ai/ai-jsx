import { folder, useControls } from "leva";
import BaseParticleSwarm from "./base";
import Ground from "../../ground";
import { Vector3 } from "three";
import { MotionVisualProps } from "../common";

const ParticleSwarmVisual = ({ motionMapper }: MotionVisualProps) => {
  const { maxDim, pointSize } = useControls({
    Particles: folder(
      {
        maxDim: { value: 10, min: 0.25, max: 10, step: 0.25 },
        pointSize: { value: 0.2, min: 0.01, max: 2, step: 0.01 },
      },
      { collapsed: true }
    ),
  });

  return (
    <>
      <BaseParticleSwarm
        motionMapper={motionMapper}
        maxDim={maxDim}
        pointSize={pointSize}
      />
      <Ground position={new Vector3(0, 0, -1.5 * maxDim)} />
    </>
  );
};

export default ParticleSwarmVisual;
