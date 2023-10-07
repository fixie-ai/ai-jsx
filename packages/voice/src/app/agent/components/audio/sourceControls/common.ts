import { folder, useControls } from "leva";

export interface AudioSourceControlsProps {
  audio: HTMLAudioElement;
}

export const AUDIO_SOURCE = {
  LIVE_STREAM: "LIVE_STREAM",
  MICROPHONE: "MICROPHONE",
  FILE_UPLOAD: "FILE_UPLOAD",
} as const;

type ObjectValues<T> = T[keyof T];
export type AudioSource = ObjectValues<typeof AUDIO_SOURCE>;

export const getAnalyzerSourceDisplayName = (source: AudioSource): string => {
  switch (source) {
    case AUDIO_SOURCE.LIVE_STREAM:
      return "🎧 livestream";
    case AUDIO_SOURCE.MICROPHONE:
      return "🎤 Microphone";
    case AUDIO_SOURCE.FILE_UPLOAD:
      return "📁 File Upload";
    default:
      throw new Error(`Unknown source ${source}`);
  }
};

export const iOS = (): boolean => {
  // apple "iP..." device detection. Ex: iPad, iPod, iPhone etc.
  if (navigator.platform.toLowerCase().startsWith("ip")) {
    return true;
  }
  // iPad on iOS 13 detection
  return (
    navigator.userAgent?.toLowerCase().startsWith("mac") &&
    "ontouchend" in document
  );
};

export const getPlatformSupportedAudioSources = (): AudioSource[] => {
  // Apple devices/browsers using WebKit do NOT support CrossOrigin Audio
  // see: https://bugs.webkit.org/show_bug.cgi?id=195043
  return iOS()
    ? [AUDIO_SOURCE.FILE_UPLOAD, AUDIO_SOURCE.MICROPHONE]
    : [
        AUDIO_SOURCE.LIVE_STREAM,
        AUDIO_SOURCE.FILE_UPLOAD,
        AUDIO_SOURCE.MICROPHONE,
      ];
};

const AVAILABLE_SOURCES = getPlatformSupportedAudioSources();
export function useSelectAudioSource() {
  const audioSourceParam = new URLSearchParams(document.location.search).get(
    "audioSource"
  ) as AudioSource | null;
  const { audioSource } = useControls({
    Audio: folder({
      audioSource: {
        value:
          audioSourceParam && AVAILABLE_SOURCES.includes(audioSourceParam)
            ? audioSourceParam
            : AVAILABLE_SOURCES[0],
        options: AVAILABLE_SOURCES.reduce(
          (o, src) => ({ ...o, [getAnalyzerSourceDisplayName(src)]: src }),
          {}
        ),
        order: -100,
      },
    }),
  });
  return audioSource;
}

export const buildAudio = () => {
  console.log("Building audio...");
  const out = new Audio();
  out.crossOrigin = "anonymous";
  return out;
};

const webAudioTouchUnlock = (context: AudioContext) => {
  return new Promise(function (resolve, reject) {
    const unlockTriggerNames = ["mousedown", "touchstart", "touchend"] as const;
    if (context.state === "suspended" && "ontouchstart" in window) {
      var unlock = function () {
        context.resume().then(
          function () {
            unlockTriggerNames.forEach((name) => {
              document.body.removeEventListener(name, unlock);
            });
            resolve(true);
          },
          function (reason) {
            reject(reason);
          }
        );
      };
      unlockTriggerNames.forEach((name) => {
        document.body.addEventListener(name, unlock, false);
      });
    } else {
      resolve(false);
    }
  });
};

export const buildAudioContext = () => {
  console.log("Building audioCtx...");
  const audioCtx = new window.AudioContext();
  if (iOS()) {
    console.log("Attempting to unlock AudioContext");
    webAudioTouchUnlock(audioCtx).then(
      function (unlocked) {
        if (unlocked) {
          // AudioContext was unlocked from an explicit user action,
          // sound should work now
          console.log("Successfully unlocked AudioContext!");
        } else {
          // There was no need for unlocking, devices other than iOS
          console.log("No need to unlock AudioContext.");
        }
      },
      function (reason) {
        console.error(reason);
      }
    );
  }
  return audioCtx;
};
