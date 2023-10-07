import { useCallback } from "react";
import { useInputContext, Components } from "leva/plugin";
import type { AudioFileInputProps } from "./types";
const { Row, Label } = Components;
import {
  DropZone,
  FileInputContainer,
  FilePreview,
  Instructions,
  Remove,
} from "./styled";

export function AudioFileInputComponent() {
  const { label, value, onUpdate, disabled } =
    useInputContext<AudioFileInputProps>();
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

  const { getRootProps, getInputProps, isDragAccept, open } = useDropzone({
    maxFiles: 1,
    accept:
      "audio/,audio/mpeg,audio/ogg,application/ogg,audio/x-aiff,audio/vnd.wav",
    onDrop,
    disabled,
    noClick: true,
  });

  // TODO fix any in DropZone
  return (
    <Row input>
      <Label>{label}</Label>
      <FileInputContainer>
        {!!value ? (
          <>
            <FilePreview>
              <Remove onClick={clear} disabled={!value}>
                {`⏹${(value as File).name}`}
              </Remove>
            </FilePreview>
          </>
        ) : (
          <DropZone {...(getRootProps({ isDragAccept }) as any)} onClick={open}>
            <input {...getInputProps()} />
            <Instructions>{"Click to Upload"}</Instructions>
          </DropZone>
        )}
      </FileInputContainer>
    </Row>
  );
}
