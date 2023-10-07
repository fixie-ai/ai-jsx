import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, InstancedMesh, Matrix4, MeshBasicMaterial } from "three";
import {
  ICoordinateMapper,
  HALF_DIAGONAL_UNIT_SQUARE,
  COORDINATE_TYPE,
} from "../../mappers/coordinateMappers/common";
import { ColorPalette, ColorPaletteType, COLOR_PALETTE } from "../palettes";

interface BaseCubeProps {
  coordinateMapper: ICoordinateMapper;
  nPerSide?: number;
  cubeSideLength?: number;
  cubeSpacingScalar?: number;
  volume?: boolean;
  palette?: ColorPaletteType;
}

const BaseCube = ({
  coordinateMapper,
  nPerSide = 10,
  cubeSideLength = 0.5,
  cubeSpacingScalar = 0.1,
  volume = true,
  palette = COLOR_PALETTE.THREE_COOL_TO_WARM,
}: BaseCubeProps) => {
  const meshRef = useRef<InstancedMesh>(null!);
  const tmpMatrix = useMemo(() => new Matrix4(), []);
  const inputCoordinateType = volume
    ? COORDINATE_TYPE.CARTESIAN_3D
    : COORDINATE_TYPE.CARTESIAN_CUBE_FACES;
  const lut = ColorPalette.getPalette(palette).buildLut();

  // Recolor
  useEffect(() => {
    let instanceIdx, normCubeX, normCubeY, normCubeZ, normRadialOffset;
    // interior
    for (let row = 0; row < nPerSide; row++) {
      for (let col = 0; col < nPerSide; col++) {
        for (let depth = 0; depth < nPerSide; depth++) {
          instanceIdx = row * nPerSide ** 2 + col * nPerSide + depth;
          normCubeX = row / (nPerSide - 1);
          normCubeY = col / (nPerSide - 1);
          normCubeZ = depth / (nPerSide - 1);
          // Exterior:
          if (normCubeX == 0 || normCubeX == 1) {
            normRadialOffset =
              Math.hypot(normCubeY - 0.5, normCubeZ - 0.5) /
              HALF_DIAGONAL_UNIT_SQUARE;
          } else if (normCubeY == 0 || normCubeY == 1) {
            normRadialOffset =
              Math.hypot(normCubeX - 0.5, normCubeZ - 0.5) /
              HALF_DIAGONAL_UNIT_SQUARE;
          } else if (normCubeZ == 0 || normCubeZ == 1) {
            normRadialOffset =
              Math.hypot(normCubeX - 0.5, normCubeY - 0.5) /
              HALF_DIAGONAL_UNIT_SQUARE;
          } else {
            // interior
            normRadialOffset = 0;
          }
          meshRef.current.setColorAt(
            instanceIdx,
            lut.getColor(normRadialOffset)
          );
        }
      }
    }
    meshRef.current.instanceColor!.needsUpdate = true;
  });

  useFrame(({ clock }) => {
    //in ms
    const elapsedTimeSec = clock.getElapsedTime();
    const faceSize = nPerSide * (1 + cubeSpacingScalar) * cubeSideLength;
    let instanceIdx, normCubeX, normCubeY, normCubeZ, x, y, z, normalizedScale;
    for (let row = 0; row < nPerSide; row++) {
      for (let col = 0; col < nPerSide; col++) {
        for (let depth = 0; depth < nPerSide; depth++) {
          instanceIdx = row * nPerSide ** 2 + col * nPerSide + depth;
          normCubeX = row / (nPerSide - 1);
          normCubeY = col / (nPerSide - 1);
          normCubeZ = depth / (nPerSide - 1);
          x = faceSize * (normCubeX - 0.5);
          y = faceSize * (normCubeY - 0.5);
          z = faceSize * (normCubeZ - 0.5);
          // Position
          tmpMatrix.setPosition(x, y, z);

          // Scale
          normalizedScale =
            0.1 +
            0.9 *
              coordinateMapper.map(
                inputCoordinateType,
                normCubeX,
                normCubeY,
                normCubeZ,
                elapsedTimeSec
              );
          tmpMatrix.elements[0] = normalizedScale;
          tmpMatrix.elements[5] = normalizedScale;
          tmpMatrix.elements[10] = normalizedScale;
          meshRef.current.setMatrixAt(instanceIdx, tmpMatrix);
        }
      }
    }
    // Update the instance
    meshRef.current.instanceMatrix!.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      castShadow={true}
      receiveShadow={true}
      args={[new BoxGeometry(), new MeshBasicMaterial(), nPerSide ** 3]}
    >
      <boxGeometry
        attach="geometry"
        args={[cubeSideLength, cubeSideLength, cubeSideLength, 1]}
      />
      <meshBasicMaterial attach="material" color={"white"} toneMapped={false} />
    </instancedMesh>
  );
};

export default BaseCube;
