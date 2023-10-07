import { createPlugin } from 'leva/plugin'
import { AudioFileInputComponent } from './component'
import { normalize, sanitize } from './plugin'

export const audioFileInput = createPlugin({
  normalize,
  sanitize,
  component: AudioFileInputComponent,
})