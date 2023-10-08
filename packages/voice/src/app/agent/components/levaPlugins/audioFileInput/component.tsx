import { useCallback } from 'react';
import { useInputContext, Components } from 'leva/plugin';
import type { AudioFileInputProps } from './types';
const { Row, Label } = Components;
import { DropZone, FileInputContainer, FilePreview, Instructions, Remove } from './styled';

export function AudioFileInputComponent() {
  const { label, value, onUpdate, disabled } = useInputContext<AudioFileInputProps>();
  const onDrop = useCallback(
    (acceptedFiles: string | any[]) => {
      if (acceptedFiles.length) onUpdate(acceptedFiles[0]);
    },
    [onUpdate]
  );

  const clear = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onUpdate(undefined);
    },
    [onUpdate]
  );

  // TODO fix any in DropZone
  return <Row></Row>;
}
