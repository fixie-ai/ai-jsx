import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry,
  CatmullRomCurve3,
  Points,
  Vector2,
  Vector3,
} from "three";
import {
  COORDINATE_TYPE,
  gaussianRandom,
  ICoordinateMapper,
} from "../../mappers/coordinateMappers/common";

const computeNormals = (
  vertices: Vector2[],
  weighted: boolean = false
): Vector2[] => {
  const n = vertices.length;
  const normals = new Array<Vector2>();
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const edgeVec = vertices[j].clone().sub(vertices[i]);
    const normal = new Vector2(-edgeVec.y, edgeVec.x);
    normals.push(weighted ? normal : normal.normalize());
  }

  const vertexNormals = new Array<Vector2>();
  for (let i = 0; i < n; i++) {
    const j = (n + i - 1) % n;
    vertexNormals.push(normals[i].clone().add(normals[j]).normalize());
  }
  return vertexNormals;
};

interface BaseTraceParticlesProps {
  coordinateMapper: ICoordinateMapper;
  polyStates: Vector2[][];
  parametricMin?: number;
  parametricMax?: number;
  useNoise?: boolean;
  power?: number;
  nPoints?: number;
  pointSize?: number;
  transitionSpeedSec?: number;
}

const BaseTraceParticles = ({
  coordinateMapper,
  polyStates,

  parametricMin = 0.0,
  parametricMax = 1.0,
  power = 2.0,
  useNoise = false,
  pointSize = 0.2,
  nPoints = 5000,
  transitionSpeedSec = 2.5,
}: BaseTraceParticlesProps) => {
  const scale = 25.0;
  const noise = [...Array(nPoints)].map(gaussianRandom);
  const referencePositionsByPoly = polyStates.map((poly) =>
    new CatmullRomCurve3(
      poly.map((v) => new Vector3(v.x, v.y, 0.0).multiplyScalar(scale)),
      false,
      "catmullrom",
      0
    ).getSpacedPoints(nPoints)
  );
  const referenceNormalsByPoly = referencePositionsByPoly.map(
    (referencePositions) =>
      computeNormals(referencePositions.map((v) => new Vector2(v.x, v.y)))
  );
  const refPoints = useRef<Points>(null!);
  const refBufGeo = useRef<BufferGeometry>(null!);
  useLayoutEffect(() => {
    if (refBufGeo.current) {
      refBufGeo.current.setFromPoints(referencePositionsByPoly[0]);
    }
  }, []);
  const totalCycleSec = transitionSpeedSec * polyStates.length;

  useFrame(({ clock }) => {
    //in ms
    const elapsedTimeSec = clock.getElapsedTime();
    const normCycleTime = (elapsedTimeSec % totalCycleSec) / totalCycleSec;
    const currPolyIdx = Math.floor(normCycleTime * polyStates.length);
    const nextPolyIdx =
      currPolyIdx + 1 >= polyStates.length ? 0 : currPolyIdx + 1;
    const transitionAlpha =
      (elapsedTimeSec % transitionSpeedSec) / transitionSpeedSec;

    const polyAPos = referencePositionsByPoly[currPolyIdx];
    const polyBPos = referencePositionsByPoly[nextPolyIdx];
    const polyANorm = referenceNormalsByPoly[currPolyIdx];
    const polyBNorm = referenceNormalsByPoly[nextPolyIdx];

    let offset, normIdx;
    const tmpVecA = new Vector3();
    const tmpVecB = new Vector3();
    const positionsBuffer = refPoints.current.geometry.attributes.position;

    for (let i = 0; i < nPoints; i++) {
      normIdx = i / (nPoints - 1);
      if (normIdx < parametricMin || normIdx > parametricMax) {
        positionsBuffer.setXYZ(i, 0, 0, 0);
        continue;
      }
      offset =
        power *
        coordinateMapper.map(
          COORDINATE_TYPE.CARTESIAN_1D,
          (normIdx - parametricMin) / Math.abs(parametricMax - parametricMin),
          // normIdx,
          0,
          0,
          elapsedTimeSec
        );
      if (useNoise) {
        offset *= noise[i];
      }

      // positionsBuffer.setZ(i, effectiveRadius);
      tmpVecA.set(
        polyAPos[i].x + offset * polyANorm[i].x, // x
        polyAPos[i].y + offset * polyANorm[i].y, // y
        polyAPos[i].z // z
      );
      if (currPolyIdx !== nextPolyIdx) {
        tmpVecB.set(
          polyBPos[i].x + offset * polyBNorm[i].x, // x
          polyBPos[i].y + offset * polyBNorm[i].y, // y
          polyBPos[i].z // z
        );
        tmpVecA.lerp(tmpVecB, transitionAlpha);
      }
      positionsBuffer.setXYZ(i, tmpVecA.x, tmpVecA.y, tmpVecA.z);
    }
    positionsBuffer.needsUpdate = true;
  });

  return (
    <points ref={refPoints}>
      <bufferGeometry attach="geometry" ref={refBufGeo} />
      <pointsMaterial attach="material" size={pointSize} />
    </points>
  );
};

export default BaseTraceParticles;
