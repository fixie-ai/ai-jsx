import { folder, useControls } from "leva";
import { Vector3 } from "three";
import Ground from "../../ground";
import BaseCube from "./base";
import { VisualProps } from "../common";
import { COLOR_PALETTE } from "../palettes";

const CubeVisual = ({
  coordinateMapper,
  palette = COLOR_PALETTE.THREE_COOL_TO_WARM,
}: VisualProps) => {
  const { nPerSide, cubeUnitSideLength, cubeUnitSpacingScalar, volume } =
    useControls({
      "Visual - Cube": folder(
        {
          nPerSide: {
            value: 10,
            min: 3,
            max: 50,
            step: 1,
          },
          cubeUnitSideLength: {
            value: 0.5,
            min: 0.1,
            max: 2.0,
            step: 0.05,
          },
          cubeUnitSpacingScalar: {
            value: 0.1,
            min: 0,
            max: 2,
            step: 0.1,
          },
          volume: true,
        },
        { collapsed: true }
      ),
    });

  return (
    <>
      <BaseCube
        coordinateMapper={coordinateMapper}
        nPerSide={nPerSide}
        cubeSideLength={cubeUnitSideLength}
        cubeSpacingScalar={cubeUnitSpacingScalar}
        volume={volume}
        palette={palette}
      />
      <Ground
        position={
          new Vector3(
            0,
            0,
            -0.75 * nPerSide * (1 + cubeUnitSpacingScalar) * cubeUnitSideLength
          )
        }
      />
    </>
  );
};

export default CubeVisual;
