import * as LLMx from '../index.js';
import { Node, Component, RenderContext } from '../index.js';
import { DalleImageGen } from '../lib/openai.js';

export interface ImageGenProps {
  /** defines how many image samples should be produced */
  numSamples?: number;
  /** defines the image resolution */
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
  if (process.env.OPENAI_API_KEY) {
    return <DalleImageGen {...props}>{children}</DalleImageGen>;
  }

  throw new Error(
    'No image generation model was specified. Set the OPENAI_API_KEY environment variable to use OpenAI or use an explicit ImageGenProvider.'
  );
}

const imageGenContext = LLMx.createContext<[ImageGenComponent<ImageGenPropsWithChildren>, ImageGenProps]>([
  AutomaticImageGenModel,
  {},
]);

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
 * Perform a model call to do a [image generation](https://platform.openai.com/docs/guides/images/introduction).
 *
 * @returns a URL to the generated image
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
