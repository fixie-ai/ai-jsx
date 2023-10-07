import { styled } from 'leva/plugin'

export const FileInputContainer = styled('div', {
  position: 'relative',
  display: 'flex',
  gridTemplateColumns: '$sizes$rowHeight auto auto',
  columnGap: '$colGap',
  alignItems: 'center',
})

export const DropZone = styled('div', {
  $flexCenter: '',
  overflow: 'hidden',
  height: '$rowHeight',
  background: '$elevation3',
  textAlign: 'center',
  color: 'inherit',
  borderRadius: '$sm',
  outline: 'none',
  userSelect: 'none',
  cursor: 'pointer',
  $inputStyle: '',
  $hover: '',
  $focusWithin: '',
  $active: '$accent1 $elevation1',
  variants: {
    isDragAccept: {
      true: {
        $inputStyle: '$accent1',
        backgroundColor: '$elevation1',
      },
    },
  },
})

export const FilePreview = styled('div', {
  boxSizing: 'border-box',
  overflow: 'hidden',
  borderRadius: '$sm',
  height: '$rowHeight',
  $inputStyle: '',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
})

export const Instructions = styled('div', {
  fontSize: '0.8em',
  height: '100%',
  padding: '$rowGap $md',
})


export const Remove = styled('div', {
  $flexLeft: '',
  top: '0',
  right: '0',
  marginRight: '$sm',
  height: '100%',
  cursor: 'pointer',
  
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',

  variants: {
    disabled: {
      true: { color: '$elevation3', cursor: 'default' },
    },
  },
})