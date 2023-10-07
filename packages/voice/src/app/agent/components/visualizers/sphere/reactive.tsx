import { folder, useControls } from "leva";
import { Vector3 } from "three";
import Ground from "../../ground";
import BaseSphere from "./base";
import { VisualProps } from "../common";
import { COLOR_PALETTE } from "../palettes";

const SphereVisual = ({
  coordinateMapper,
  palette = COLOR_PALETTE.THREE_COOL_TO_WARM,
}: VisualProps) => {
  const {
    radius,
    nPoints,
    cubeSideLength,
    // mapMode
  } = useControls({
    "Visual - Sphere": folder(
      {
        radius: { value: 2, min: 0.25, max: 3, step: 0.25 },
        nPoints: { value: 800, min: 100, max: 2000, step: 25 },
        cubeSideLength: {
          value: 0.05,
          min: 0.01,
          max: 0.5,
          step: 0.005,
        },
        // mapMode: {
        //   value: MAPPING_MODE_POLAR_2D,
        //   options: [
        //     MAPPING_MODE_POLAR_2D,
        //     MAPPING_MODE_POLAR_PHI,
        //     MAPPING_MODE_POLAR_THETA,
        //   ],
        // },
      },
      { collapsed: true }
    ),
  });

  return (
    <>
      <BaseSphere
        coordinateMapper={coordinateMapper}
        radius={radius}
        nPoints={nPoints}
        cubeSideLength={cubeSideLength}
        palette={palette}
      />
      <Ground
        position={
          new Vector3(0, 0, -radius * (1 + 0.25 * coordinateMapper.amplitude))
        }
      />
    </>
  );
};

export default SphereVisual;
