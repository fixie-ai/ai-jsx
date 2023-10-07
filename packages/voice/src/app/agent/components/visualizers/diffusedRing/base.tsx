import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Points } from "three";
import {
  COORDINATE_TYPE,
  gaussianRandom,
  ICoordinateMapper,
  TWO_PI,
} from "../../mappers/coordinateMappers/common";

interface BaseDiffusedRingProps {
  coordinateMapper: ICoordinateMapper;
  radius?: number;
  nPoints?: number;
  pointSize?: number;
  mirrorEffects?: boolean;
}

const BaseDiffusedRing = ({
  coordinateMapper,
  radius = 2.0,
  pointSize = 0.2,
  nPoints = 1000,
  mirrorEffects = false,
}: BaseDiffusedRingProps) => {
  const noise = [...Array(nPoints)].map(gaussianRandom);
  const refPoints = useRef<Points>(null!);

  useFrame(({ clock }) => {
    //in ms
    const elapsedTimeSec = clock.getElapsedTime();
    let effectiveRadius, normIdx, angRad, effectNorm;
    const positionsBuffer = refPoints.current.geometry.attributes.position;
    for (let i = 0; i < nPoints; i++) {
      normIdx = i / (nPoints - 1);
      effectiveRadius =
        radius *
        (1 +
          noise[i] *
            coordinateMapper.map(
              COORDINATE_TYPE.CARTESIAN_1D,
              mirrorEffects ? 2 * Math.abs(normIdx - 0.5) : normIdx,
              0,
              0,
              elapsedTimeSec
            ));

      angRad = normIdx * TWO_PI;
      positionsBuffer.setXYZ(
        i,
        effectiveRadius * Math.cos(angRad), // x
        effectiveRadius * Math.sin(angRad), // y
        0 // z
      );
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
      <pointsMaterial attach="material" size={pointSize} />
    </points>
  );
};

export default BaseDiffusedRing;
