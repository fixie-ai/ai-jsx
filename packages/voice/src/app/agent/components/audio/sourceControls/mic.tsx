import { useEffect, useRef } from "react";
import { AudioSourceControlsProps } from "./common";

export interface MicrophoneAudioControlsProps extends AudioSourceControlsProps {
  onMicDisabled: () => void;
  onStreamCreated: (stream: MediaStream) => void;
}
const MicrophoneAudioControls = ({
  audio,
  onMicDisabled,
  onStreamCreated,
}: MicrophoneAudioControlsProps) => {
  const micStream = useRef<null | MediaStreamAudioSourceNode>(null!);

  /**
   * Make sure the microphone is enabled
   */
  useEffect(() => {
    console.log("Disabling mic...");
    onMicDisabled();
    if (micStream?.current) {
      micStream.current = null;
    }

    console.log("Enabling mic...");
    if (navigator.mediaDevices) {
      navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then(onStreamCreated)
        .catch((err) => {
          alert("Microphone access denied by user");
        });
    } else {
      alert("User mediaDevices not available");
    }

    return () => {
      audio.pause();
      if (micStream?.current) {
        micStream.current = null;
      }
    };
  }, [audio, onMicDisabled, onStreamCreated]);

  return <></>;
};

export default MicrophoneAudioControls;
