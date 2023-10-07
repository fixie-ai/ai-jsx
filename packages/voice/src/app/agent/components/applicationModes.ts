export const APPLICATION_MODE = {
  WAVE_FORM: "WAVE_FORM",
  NOISE: "NOISE",
  AUDIO: "AUDIO",
  AUDIO_SCOPE: "AUDIO_SCOPE",
} as const;

type ObjectValues<T> = T[keyof T];
export type ApplicationMode = ObjectValues<typeof APPLICATION_MODE>;

export const getAppModeDisplayName = (mode: ApplicationMode): string => {
  switch (mode) {
    case APPLICATION_MODE.WAVE_FORM:
      return "~ waveform";
    case APPLICATION_MODE.NOISE:
      return "x noise func";
    case APPLICATION_MODE.AUDIO:
      return "🎧 audio";
    case APPLICATION_MODE.AUDIO_SCOPE:
      return "🎧 audioscope";
    default:
      throw new Error(`Unknown mode ${mode}`);
  }
};

export const getPlatformSupportedApplicationModes = (): ApplicationMode[] => {
  return [
    APPLICATION_MODE.WAVE_FORM,
    APPLICATION_MODE.NOISE,
    APPLICATION_MODE.AUDIO,
    APPLICATION_MODE.AUDIO_SCOPE,
  ];
};
