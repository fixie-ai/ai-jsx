/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/react';
import { UICompletion } from 'ai-jsx/react/completion';
import { useState, ReactNode } from 'react';
import { Prompt } from 'ai-jsx/batteries/prompts';
import { OpenAI } from 'ai-jsx/lib/openai';
import ResultContainer from '../ResultContainer.tsx';
import InputPrompt from '../InputPrompt.tsx';

// Even though we're using raw-loader, we don't get the actual contents on disk,
// because the babel pipeline still runs. I think there should be a way to tell webpack
// to skip all downstream processing for files imported via raw-loader.

// @ts-expect-error
// eslint-disable-next-line import/no-unresolved
import buildingBlockContents from 'raw-loader!./BuildingBlocks.tsx';
// @ts-expect-error
// eslint-disable-next-line import/no-unresolved
import aiBuildingBlockContents from 'raw-loader!./AIBuildingBlocks.tsx';

import * as BuildingBlocks from './BuildingBlocks.tsx';
import * as AIBuildingBlocks from './AIBuildingBlocks.tsx';

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
              aiComponentsDoc={aiBuildingBlockContents}
              reactComponents={BuildingBlocks}
              aiComponents={AIBuildingBlocks}
            >
              <Prompt persona="a fantasy fiction writer" />
              Give me a story about {query}. Make sure to give it an interesting title. The story should have 3-5
              chapters.
              {'\n'}
              Make sure to generate an image for each chapter to make it more interesting. In each chapter, use buttons
              to let the user flag inappropriate content. At the end, show a form to collect the user's feedback.
            </UICompletion>
          </OpenAI>
        </AI.jsx>
      </ResultContainer>
    </>
  );
}
