import { folder, useControls } from "leva";
import { useEffect, useRef } from "react";
import {
  useAppStateActions,
  useEnergyInfo,
  useVisualSourceDataX,
} from "../../appState";
import FFTAnalyzer, { EnergyMeasure } from "./analyzers/fft";

export interface FFTAnalyzerControlsProps {
  analyzer: FFTAnalyzer;
}
const FFTAnalyzerControls = ({ analyzer }: FFTAnalyzerControlsProps) => {
  const { octaveBands, energyMeasure } = useControls({
    Audio: folder({
      octaveBands: {
        value: 2,
        order: 75,
        options: {
          "1/24th octave bands": 1,
          "1/12th octave bands": 2,
          "1/8th octave bands": 3,
          "1/6th octave bands": 4,
          "1/4th octave bands": 5,
          "1/3rd octave bands": 6,
          "Half octave bands": 7,
          "Full octave bands": 8,
        },
      },
      energyMeasure: {
        value: "overall",
        order: 76,
        options: [
          "overall",
          "peak",
          "bass",
          "lowMid",
          "mid",
          "highMid",
          "treble",
        ],
      },
    }),
  });
  const freqData = useVisualSourceDataX();
  const energyInfo = useEnergyInfo();
  const { resizeVisualSourceData } = useAppStateActions();
  const animationRequestRef = useRef<number>(null!);

  /**
   * Transfers data from the analyzer to the target array
   */
  const animate = (): void => {
    const bars = analyzer.getBars();

    if (freqData.length != bars.length) {
      console.log(`Resizing ${bars.length}`);
      resizeVisualSourceData(bars.length);
      return;
    }

    energyInfo.current = analyzer.getEnergy(energyMeasure as EnergyMeasure);

    bars.forEach(({ value }, index) => {
      freqData[index] = value;
    });
    animationRequestRef.current = requestAnimationFrame(animate);
  };

  /**
   * Re-Synchronize the animation loop if the target data destination changes.
   */
  useEffect(() => {
    if (animationRequestRef.current) {
      cancelAnimationFrame(animationRequestRef.current);
    }
    animationRequestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRequestRef.current);
  }, [freqData, energyMeasure]);

  /**
   * Make sure an analyzer exists with the correct mode
   */
  useEffect(() => {
    analyzer.mode = octaveBands;
  }, [octaveBands]);
  return <></>;
};

export default FFTAnalyzerControls;
