/**
 * This module provides components for image generation.
 * @packageDocumentation
 */

import * as AI from '../index.js';
import { Node, Component, RenderContext } from '../index.js';
import { AIJSXError, ErrorCode } from '../core/errors.js';
import { DalleImageGen } from '../lib/openai.js';
import { getEnvVar } from '../lib/util.js';
import { StableDiffusionImageGen } from '../lib/stabilityai.js';

/**
 * Represents properties passed to the {@link ImageGen} component.
 */
export interface ImageGenProps {
  /** The number of image samples to produce. */
  numSamples?: number;
  /** The image resolution. */
  size?: number;
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
  } else if (process.env.STABILITY_API_KEY) {
    return <StableDiffusionImageGen {...props}>{children}</StableDiffusionImageGen>;
  }

  throw new AIJSXError(
    'No image generation model was specified. Set the OPENAI_API_KEY environment variable to use OpenAI or use an explicit ImageGenProvider.',
    ErrorCode.MissingImageModel,
    'user'
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
 * @returns a URL to the generated image.
 *
 * @example
 * ```tsx
 *    <ImageGen size={256} numSamples={1}>
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
