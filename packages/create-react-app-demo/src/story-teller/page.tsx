/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/react';
import { UICompletion } from 'ai-jsx/react/completion';
import { useState, ReactNode } from 'react';
import { Prompt } from 'ai-jsx/batteries/prompts';
import { ImageGen as BaseImageGen, ImageGenPropsWithChildren } from 'ai-jsx/core/image-gen';
import { OpenAI } from 'ai-jsx/lib/openai';
import ResultContainer from '../ResultContainer.tsx';
import InputPrompt from '../InputPrompt.tsx';
// @ts-expect-error
// eslint-disable-next-line import/no-unresolved
import buildingBlockContents from 'raw-loader!./BuildingBlocks.tsx';

console.log({buildingBlockContents});

export function ImageGen(props: ImageGenPropsWithChildren) {
  return (
    <BaseImageGen size="256x256" {...props}>
      A picture in the style of a children's book illustration: {props.children}
    </BaseImageGen>
  );
}

export default function StoryTellerWrapper() {
  const [query, setQuery] = useState('the adventures of Leah and her dog');

  return (
    <>
      <ResultContainer
        title="Story Teller"
        description="In this demo, AI will generate a children's story with images on-the-fly."
      >
        <InputPrompt label="What is the topic of the story?" value={query} setValue={setQuery} />
      </ResultContainer>
      <ResultContainer title={`AI comes up with a story for "${query}"`}>
        <AI.jsx>
          <OpenAI chatModel="gpt-4">
            <UICompletion
              reactComponentsDoc={buildingBlockContents}
              aiComponentsDoc={
                <>
                  <ImageGen>a detailed prompt for the image</ImageGen>: A special component that will generate an image
                  for you. All you need to do is to provide a prompt that describes the image you want. The prompt
                  should be descriptive enough to generate an image that is relevant to the story.
                </>
              }
            >
              <Prompt persona="a fantasy fiction writer" />
              Give me a story about {query}. Make sure to give it an interesting title. The story should have 3-5
              chapters.
              {'\n'}
              Make sure to generate an image for each chapter to make it more interesting.
            </UICompletion>
          </OpenAI>
        </AI.jsx>
      </ResultContainer>
    </>
  );
}
