import { folder, useControls } from "leva";
import { useEffect, useState } from "react";
import { audioFileInput } from "../../levaPlugins/audioFileInput";
import { AudioSourceControlsProps, iOS } from "./common";
import "./overlay.css";

const useAudioFile = (audio: HTMLAudioElement) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { audioFile } = useControls({
    Audio: folder({
      audioFile: audioFileInput({ file: undefined }),
    }),
  });

  const playAudio = () => {
    if (!audioFile) {
      return;
    }
    // Can play immediately on non-ios platforms
    const promise = audio.play();
    if (promise !== undefined) {
      promise
        .then(() => {
          setIsPlaying(true);
          console.log(`Playing ${audioFile.name}`);
        })
        .catch((error) => {
          // Auto-play was prevented
          console.error(`Error playing ${audioFile}`, error);
        });
    }
  };

  /**
   * Make sure the correct file is playing
   */
  useEffect(() => {
    console.log("Syncing, start w/ pause...");
    audio.pause();
    setIsPlaying(false);

    if (!audioFile) {
      setLoaded(false);
      return;
    }

    console.log("Setting source...");
    audio.src = URL.createObjectURL(audioFile);
    setLoaded(true);

    // Can play immediately on non-ios platforms
    if (!iOS()) {
      playAudio();
    }

    return () => {
      console.log("Pausing...");
      audio.pause();
      setIsPlaying(false);
    };
  }, [audio, audioFile]);

  return {
    loaded,
    isPlaying,
    playAudio,
  };
};
const FileAudioControls = ({ audio }: AudioSourceControlsProps) => {
  const { loaded, isPlaying, playAudio } = useAudioFile(audio);

  // IOS needs a dedicated play button
  return iOS() ? (
    <div
      id="info"
      style={{
        top: "1rem",
        left: "1rem",
        // top: "50%",
        // left: "50%",
        // transform: "translateX(-50%) translateY(-50%)",
        // msTransform: "translateX(-50%) translateY(-50%)",
      }}
      hidden={isPlaying}
    >
      {loaded ? (
        <button disabled={!loaded || isPlaying} onClick={playAudio}>
          Play Audio
        </button>
      ) : (
        <>
          <h2>Load a file</h2>
          <p>Use the controls panel to upload an audio file.</p>
        </>
      )}
    </div>
  ) : (
    <></>
  );
};

export default FileAudioControls;
