import { folder, useControls } from "leva";
import { Vector3 } from "three";
import Ground from "../../ground";
import BaseGrid from "./base";
import { VisualProps } from "../common";
import { COLOR_PALETTE } from "../palettes";

const GridVisual = ({
  coordinateMapper,
  palette = COLOR_PALETTE.THREE_COOL_TO_WARM,
}: VisualProps) => {
  const { nGridRows, nGridCols, gridUnitSideLength, gridUnitSpacingScalar } =
    useControls({
      "Visual - Grid": folder(
        {
          nGridRows: {
            value: 100,
            min: 2,
            max: 500,
            step: 1,
          },
          nGridCols: {
            value: 100,
            min: 2,
            max: 500,
            step: 1,
          },
          gridUnitSideLength: {
            value: 0.025,
            min: 0.01,
            max: 0.5,
            step: 0.005,
          },
          gridUnitSpacingScalar: {
            value: 5,
            min: 1,
            max: 10,
            step: 0.5,
          },
        },
        { collapsed: true }
      ),
    });

  return (
    <>
      <BaseGrid
        coordinateMapper={coordinateMapper}
        nGridRows={nGridRows}
        nGridCols={nGridCols}
        cubeSideLength={gridUnitSideLength}
        cubeSpacingScalar={gridUnitSpacingScalar}
        palette={palette}
      />
      <Ground position={new Vector3(0, 0, -2.5 * coordinateMapper.amplitude)} />
    </>
  );
};

export default GridVisual;
