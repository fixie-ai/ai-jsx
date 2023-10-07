import { useEffect, useMemo } from "react";
import FFTAnalyzerControls from "./fftAnalyzerControls";
import ExternalFFTAnalyzer from "./analyzers/exfft";
import { AudioAnalyser } from "three";

export interface AudioFFTAnalyzerProps {
  localAnalyzer: AudioAnalyser;
  remoteAnalyzer: AudioAnalyser;
}
const AudioFFTAnalyzer = ({localAnalyzer, remoteAnalyzer}: AudioFFTAnalyzerProps) => {
  const analyzer = useMemo(() => {
    console.log("Creating analyzer...");
    return new ExternalFFTAnalyzer(localAnalyzer, remoteAnalyzer);
  }, []);
  return (
    <>
      <FFTAnalyzerControls analyzer={analyzer} />
    </>
  );
};

export default AudioFFTAnalyzer;
