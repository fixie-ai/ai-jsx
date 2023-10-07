import { useEffect, useMemo } from "react";
import ControlledAudioSource from "../audio/audioSource";
import {
  AudioSource,
  AUDIO_SOURCE,
  buildAudio,
  buildAudioContext,
  useSelectAudioSource,
} from "../audio/sourceControls/common";
import MicrophoneAudioControls from "../audio/sourceControls/mic";
import FFTAnalyzerControls from "./fftAnalyzerControls";
import FFTAnalyzer from "./analyzers/fft";
import { useMicrophoneLink } from "./analyzers/common";

interface InternalAudioAnalyzerProps {
  audioSource: AudioSource;
}
const InternalAudioFFTAnalyzer = ({
  audioSource,
}: InternalAudioAnalyzerProps) => {
  if (audioSource === AUDIO_SOURCE.MICROPHONE) {
    throw new Error("Use InternalMicrophoneFFTAnalyzer for microphone inputs.");
  }

  const audioCtx = useMemo(() => buildAudioContext(), []);
  const audio = useMemo(() => buildAudio(), []);
  const analyzer = useMemo(() => {
    console.log("Creating analyzer...");
    return new FFTAnalyzer(audio, audioCtx);
  }, [audio, audioCtx]);

  useEffect(() => {
    analyzer.volume =
      (audioSource as unknown as AudioSource) === AUDIO_SOURCE.MICROPHONE
        ? 0.0
        : 1.0;
  }, [analyzer, audioSource]);

  // useEffect(() => {
  //   return () => {
  //     console.log("Removing audio.");
  //     audio.pause();
  //     audio.remove();
  //   };
  // }, [audio]);

  // useEffect(() => {
  //   return () => {
  //     console.log("Closing audio context...");
  //     audioCtx
  //       .close()
  //       .then(() => console.log("Successfully closed AudioContext."))
  //       .catch((e) => console.error(e));
  //   };
  // }, [audioCtx]);

  return (
    <>
      <ControlledAudioSource
        audio={audio}
        audioSource={audioSource as unknown as AudioSource}
      />
      <FFTAnalyzerControls analyzer={analyzer} />
    </>
  );
};

interface InternalMicrophoneFFTAnalyzerProps {}
const InternalMicrophoneFFTAnalyzer =
  ({}: InternalMicrophoneFFTAnalyzerProps) => {
    const audioCtx = useMemo(() => buildAudioContext(), []);
    const audio = useMemo(() => buildAudio(), []);
    const analyzer = useMemo(() => {
      const out = new FFTAnalyzer(audio, audioCtx);
      out.volume = 0.0;
      return out;
    }, [audio, audioCtx]);

    const { onMicDisabled, onStreamCreated } = useMicrophoneLink(
      audio,
      analyzer
    );

    return (
      <>
        <MicrophoneAudioControls
          audio={audio}
          onMicDisabled={onMicDisabled}
          onStreamCreated={onStreamCreated}
        />
        <FFTAnalyzerControls analyzer={analyzer} />
      </>
    );
  };

export interface AudioFFTAnalyzerProps {}
const AudioFFTAnalyzer = ({}: AudioFFTAnalyzerProps) => {
  const audioSource = useSelectAudioSource();

  return (audioSource as unknown as AudioSource) === AUDIO_SOURCE.MICROPHONE ? (
    <InternalMicrophoneFFTAnalyzer />
  ) : (
    <InternalAudioFFTAnalyzer
      audioSource={audioSource as unknown as AudioSource}
    />
  );
};

export default AudioFFTAnalyzer;
