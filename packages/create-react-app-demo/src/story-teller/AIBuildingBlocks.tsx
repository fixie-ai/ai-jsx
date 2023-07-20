/** @jsxImportSource ai-jsx/react */

import { ImageGen as BaseImageGen, ImageGenPropsWithChildren } from 'ai-jsx/core/image-gen';

/**
 * A component that will generate an image
 * for you. All you need to do is to provide a prompt that describes the image you want. The prompt
 * should be descriptive enough to generate an image that is relevant to the story.
 *
 * @example
 *    <ImageGen>a detailed prompt for the image</ImageGen>
 */
export function ImageGen(props: ImageGenPropsWithChildren) {
  return (
    <BaseImageGen size="256x256" {...props}>
      A picture in the style of a children's book illustration: {props.children}
    </BaseImageGen>
  );
}
