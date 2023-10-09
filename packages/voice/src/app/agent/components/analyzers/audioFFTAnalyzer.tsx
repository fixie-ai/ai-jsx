import { useEffect, useMemo } from 'react';
import FFTAnalyzerControls from './fftAnalyzerControls';
import FFTAnalyzer from './analyzers/fft';

export interface AudioFFTAnalyzerProps {
  analyzerNode?: AnalyserNode;
}
const AudioFFTAnalyzer = ({ analyzerNode }: AudioFFTAnalyzerProps) => {
  const analyzer = new FFTAnalyzer(analyzerNode);
  return (
    <>
      <FFTAnalyzerControls analyzer={analyzer} />
    </>
  );
};

export default AudioFFTAnalyzer;
