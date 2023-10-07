import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Points, Vector3 } from "three";
import { IMotionMapper } from "../../mappers/motionMappers/common";

interface BaseParticleSwarmProps {
  motionMapper: IMotionMapper;
  maxPoints?: number;
  pointSize?: number;
  maxDim?: number;
  color?: string;
}

const BaseGrid = ({
  motionMapper,
  maxPoints = 1000,
  pointSize = 0.2,
  maxDim = 2,
  color = "white",
}: BaseParticleSwarmProps) => {
  const nPerSide = Math.max(1, Math.floor(Math.cbrt(maxPoints)));
  const nPoints = Math.pow(nPerSide, 3);
  const refPoints = useRef<Points>(null!);
  const tmpPosBefore = useMemo(() => new Vector3(), []);
  const tmpPosAfter = useMemo(() => new Vector3(), []);

  useEffect(() => {
    const positionsBuffer = refPoints.current.geometry.attributes.position;
    const spacing = maxDim / nPerSide;
    let i = 0;
    for (let x = 0; x < nPerSide; x++) {
      for (let y = 0; y < nPerSide; y++) {
        for (let z = 0; z < nPerSide; z++) {
          i = x * (nPerSide * nPerSide) + y * nPerSide + z;
          positionsBuffer.setXYZ(
            i,
            -maxDim / 2 + x * spacing,
            -maxDim / 2 + y * spacing,
            -maxDim / 2 + z * spacing
          );
        }
      }
    }
    positionsBuffer.needsUpdate = true;
  });

  useFrame(({ clock }, delta) => {
    //in ms
    const elapsedTimeSec = clock.getElapsedTime();
    const positionsBuffer = refPoints.current.geometry.attributes.position;
    for (let i = 0; i < nPoints; i++) {
      tmpPosBefore.x = positionsBuffer.getX(i);
      tmpPosBefore.y = positionsBuffer.getY(i);
      tmpPosBefore.z = positionsBuffer.getZ(i);
      motionMapper.map(tmpPosBefore, delta, elapsedTimeSec, tmpPosAfter);
      positionsBuffer.setXYZ(i, tmpPosAfter.x, tmpPosAfter.y, tmpPosAfter.z);
    }
    positionsBuffer.needsUpdate = true;
  });

  return (
    <points ref={refPoints}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={new Float32Array(nPoints * 3)}
          count={nPoints}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial attach="material" color={color} size={pointSize} />
    </points>
  );
};

export default BaseGrid;
