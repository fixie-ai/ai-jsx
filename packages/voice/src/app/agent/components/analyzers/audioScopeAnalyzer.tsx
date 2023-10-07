import { useMemo } from "react";
import ControlledAudioSource from "../audio/audioSource";
import {
  AudioSource,
  AUDIO_SOURCE,
  buildAudio,
  buildAudioContext,
  useSelectAudioSource,
} from "../audio/sourceControls/common";
import MicrophoneAudioControls from "../audio/sourceControls/mic";
import { useMicrophoneLink } from "./analyzers/common";
import ScopeAnalyzer from "./analyzers/scope";
import AudioScopeAnalyzerControls from "./scopeAnalyzerControls";

interface InternalAudioScopeAnalyzerProps {
  audioSource: AudioSource;
}
const InternalAudioScopeAnalyzer = ({
  audioSource,
}: InternalAudioScopeAnalyzerProps) => {
  if (audioSource === AUDIO_SOURCE.MICROPHONE) {
    throw new Error(
      "Use InternalMicrophoneScopeAnalyzer for microphone inputs."
    );
  }
  const audioCtx = useMemo(() => buildAudioContext(), []);
  const audio = useMemo(() => buildAudio(), []);
  const analyzer = useMemo(() => {
    return new ScopeAnalyzer(audio, audioCtx);
  }, [audio, audioCtx]);

  return (
    <>
      <ControlledAudioSource
        audio={audio}
        audioSource={audioSource as unknown as AudioSource}
      />
      <AudioScopeAnalyzerControls analyzer={analyzer} />
    </>
  );
};

interface InternalMicrophoneScopeAnalyzerProps {}
const InternalMicrophoneScopeAnalyzer =
  ({}: InternalMicrophoneScopeAnalyzerProps) => {
    const audioCtx = useMemo(() => buildAudioContext(), []);
    const audio = useMemo(() => buildAudio(), []);
    const analyzer = useMemo(() => {
      return new ScopeAnalyzer(audio, audioCtx);
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
        <AudioScopeAnalyzerControls analyzer={analyzer} />
      </>
    );
  };

export interface AudioScopeAnalyzerProps {}
const AudioFFTAnalyzer = ({}: AudioScopeAnalyzerProps) => {
  const audioSource = useSelectAudioSource();

  return (audioSource as unknown as AudioSource) === AUDIO_SOURCE.MICROPHONE ? (
    <InternalMicrophoneScopeAnalyzer />
  ) : (
    <InternalAudioScopeAnalyzer
      audioSource={audioSource as unknown as AudioSource}
    />
  );
};

export default AudioFFTAnalyzer;
