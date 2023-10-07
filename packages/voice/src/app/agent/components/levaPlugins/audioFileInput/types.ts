import type { LevaInputProps } from 'leva/plugin'
export type AudioFileInputProps = LevaInputProps<File | undefined>
export type AudioFileInput = { file: undefined | File }