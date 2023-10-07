import { AudioSource, AUDIO_SOURCE } from "./sourceControls/common";
import FileAudioControls from "./sourceControls/file";
import LivestreamAudioControls from "./sourceControls/livestream";

export interface ControlledAudioSourceProps {
  audio: HTMLAudioElement;
  audioSource: AudioSource;
}
const ControlledAudioSource = ({
  audio,
  audioSource,
}: ControlledAudioSourceProps) => {
  switch (audioSource) {
    case AUDIO_SOURCE.LIVE_STREAM:
      return <LivestreamAudioControls audio={audio} />;
    case AUDIO_SOURCE.FILE_UPLOAD:
      return <FileAudioControls audio={audio} />;
    default:
      throw new Error(`Unsupported source: ${audioSource}`);
  }
};
export default ControlledAudioSource;
