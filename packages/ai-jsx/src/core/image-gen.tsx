/**
 * This module provides components for image generation.
 * @packageDocumentation
 */

import * as ReactModule from 'react';
import * as AI from '../index.js';
import * as AIR from '../react/core.js';
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
 * @returns URL(s) to the generated image(s).
 *
 * @example
 * ```tsx
 *    <ImageGen size="256x256" numSamples={1}>
 *    An image of a chicken riding a rocket ship
 *    </ImageGen>
 * ```
 */
export function ImageGen({ children, ...props }: ImageGenPropsWithChildren, { getContext }: RenderContext) {
  const [ImageGenComponent, defaultProps] = getContext(imageGenContext);
  return (
    <ImageGenComponent {...defaultProps} {...props}>
      {children}
    </ImageGenComponent>
  );
}

/**
 * A wrapper around {@link ImageGen} that renders the generated image(s) as an HTML "img" tag.
 * To be used only in the browser, not the CLI.
 *
 * @returns HTML "img" tag(s) with the generated image(s).
 */
export async function ImageGenHTML(
  {
    children,
    width = undefined,
    height = undefined,
    alt = undefined,
    ...props
  }: ImageGenPropsWithChildren & {
    /** Width for the HTML image tag. */ width?: string;
    /** Height for the HTML image tag. */ height?: string;
    /** Alternative text for the HTML image tag.  */ alt?: string;
  },
  { render }: RenderContext
) {
  const urls = await render(<ImageGen {...props}>{children}</ImageGen>);
  return (
    <AIR.React>
      {urls.split('\n').map((url) =>
        ReactModule.createElement('img', {
          src: url,
          alt: alt ?? 'Generated image',
          width: width ?? (props.size ? props.size.split('x')[0] : undefined),
          height: height ?? (props.size ? props.size.split('x')[1] : undefined),
        })
      )}
    </AIR.React>
  );
}
