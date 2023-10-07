import { useControls } from "leva";
import React, { Suspense, useEffect } from "react";
import { CoordinateMapper_WaveformSuperposition } from "../mappers/coordinateMappers/waveform";
import { ColorPaletteType, COLOR_PALETTE } from "./palettes";

interface WaveformVisualizerProps {
  visual: string;
  palette?: ColorPaletteType;
}

const WaveformVisual = ({
  visual,
  palette = COLOR_PALETTE.THREE_COOL_TO_WARM,
}: WaveformVisualizerProps) => {
  const VisualComponent = React.lazy(() => import(`./${visual}/reactive.tsx`));

  const [{ double, amplitude, frequencyHz_1, frequencyHz_2 }, set] =
    useControls(
      "Wave Generator",
      () => ({
        double: visual == "diffusedRing",
        amplitude: {
          value: 1.0,
          min: 0.0,
          max: 5.0,
          step: 0.01,
        },
        frequencyHz_1: {
          value: 2.0,
          min: 0.0,
          max: 30,
          step: 0.05,
        },
        frequencyHz_2: {
          value: 10.0,
          min: 0.0,
          max: 30,
          step: 0.05,
          render: (get) => get("Wave Generator.double"),
        },
      }),
      { collapsed: true }
    );

  const coordinateMapper = new CoordinateMapper_WaveformSuperposition(
    double ? [frequencyHz_1, frequencyHz_2] : [frequencyHz_1],
    amplitude
  );

  // Reset the default values whenever the visual changes
  useEffect(() => {
    if (visual == "diffusedRing") {
      set({
        double: true,
        amplitude: 1.0,
        frequencyHz_1: 2.0,
        frequencyHz_2: 10.0,
      });
    } else {
      set({
        double: false,
        amplitude: 1.0,
        frequencyHz_1: 2.0,
        frequencyHz_2: 10.0,
      });
    }
  }, [visual]);

  return (
    <>
      <Suspense fallback={null}>
        <VisualComponent
          coordinateMapper={coordinateMapper}
          palette={palette}
        />
      </Suspense>
    </>
  );
};

export default WaveformVisual;
