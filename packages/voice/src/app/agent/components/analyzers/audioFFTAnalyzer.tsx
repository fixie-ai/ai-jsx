import { useEffect, useMemo,useState } from 'react';
import FFTAnalyzerControls from './fftAnalyzerControls';
import FFTAnalyzer from './analyzers/fft';

export interface AudioFFTAnalyzerProps {
  analyzerNode?: AnalyserNode;
}
const AudioFFTAnalyzer = ({ analyzerNode }: AudioFFTAnalyzerProps) => {
  const [analyzer, setAnalyzer] = useState<FFTAnalyzer>();
  if (!analyzer) {
    console.log("Creating analyzer...");
    setAnalyzer(new FFTAnalyzer(analyzerNode));
  } else if (analyzerNode !== analyzer._analyzerNode) {
    console.log("Updating analyzer...");
    analyzer.setAnalyzer(analyzerNode);
  }

  return (
    <>
      <FFTAnalyzerControls analyzer={analyzer!} />
    </>
  );
};

export default AudioFFTAnalyzer;
