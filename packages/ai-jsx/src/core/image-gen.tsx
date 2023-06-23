/**
 * This module provides components for image generation.
 * @packageDocumentation
 */

import * as AI from '../index.js';
import { Node, Component, RenderContext } from '../index.js';
import { DalleImageGen } from '../lib/openai.js';
import { getEnvVar } from '../lib/util.js';

/**
 * Represents properties passed to the {@link ImageGen} component.
 */
export interface ImageGenProps {
  /** The number of image samples to produce. */
  numSamples?: number;
  /** The image resolution. */
  size?: '256x256' | '512x512' | '1024x1024';
}

export type ImageGenPropsWithChildren = ImageGenProps & {
  children: Node;
};

export type ImageGenComponent<T extends ImageGenPropsWithChildren> = Component<T>;

/**
 * If env var `OPENAI_API_KEY` is defined, use Open AI Dalle as the image gen model provider.
 *
 * This is internal and users should not need to access this directly.
 */
function AutomaticImageGenModel({ children, ...props }: ImageGenPropsWithChildren) {
  if (getEnvVar('OPENAI_API_KEY', false) || getEnvVar('OPENAI_API_BASE', false)) {
    return <DalleImageGen {...props}>{children}</DalleImageGen>;
  }

  throw new Error(
    'No image generation model was specified. Set the OPENAI_API_KEY environment variable to use OpenAI or use an explicit ImageGenProvider.'
  );
}

/** The default context used by {@link ImageGen}. */
const imageGenContext = AI.createContext<[ImageGenComponent<ImageGenPropsWithChildren>, ImageGenProps]>([
  AutomaticImageGenModel,
  {},
]);

/**
 * An ImageGenProvider is used by {@link ImageGen} to access an underlying image-generation model.
 */
export function ImageGenProvider<T extends ImageGenPropsWithChildren>(
  { component, children, ...newDefaults }: { component?: ImageGenComponent<T> } & T,
  { getContext }: RenderContext
) {
  const [existingComponent, previousDefaults] = getContext(imageGenContext);
  return (
    <imageGenContext.Provider
      value={[
        (component ?? existingComponent) as ImageGenComponent<ImageGenPropsWithChildren>,
        { ...previousDefaults, ...newDefaults },
      ]}
    >
      {children}
    </imageGenContext.Provider>
  );
}

/**
 * This component can be used to perform an [image generation](https://platform.openai.com/docs/guides/images/introduction).
 *
 * @returns URL(s) to the generated image, wrapped in {@link Image} component(s).
 *
 * @example
 * ```tsx
 *    <ImageGen size="256x256" numSamples={1}>
 *    An image of a chicken riding a rocket ship
 *    </ImageGen>
 * ```
 */
export function ImageGen(
  { children, ...props }: ImageGenPropsWithChildren & Record<string, unknown>,
  { getContext }: RenderContext
) {
  const [ImageGenComponent, defaultProps] = getContext(imageGenContext);
  return (
    <ImageGenComponent {...defaultProps} {...props}>
      {children}
    </ImageGenComponent>
  );
}

/**
 * This component describes an image to be shown.
 * It is a wrapper for the output of {@link ImageGen} to allow for first-class support of images.
 *
 * The rendering of this component depends on the environment:
 * - In terminal-based environments, this component will be rendered as a URL.
 * - In browser-based environments, this component will be rendered as an `img` tag.
 */
export function Image({
  /** The URL of the image. */
  src,
  /** The width of the image. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  width = undefined,
  /** The height of the image. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  height = undefined,
  /** Alternative text when image is not loaded. This is currently not used. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  alt = undefined,
}: {
  src: string;
  width?: number;
  height?: number;
  alt?: string;
}) {
  return src;
}
