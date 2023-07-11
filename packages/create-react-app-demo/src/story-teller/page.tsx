/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/react';
import { UICompletion } from 'ai-jsx/react/completion';
import { useState, ReactNode } from 'react';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';
import { Prompt } from 'ai-jsx/batteries/prompts';
import { ImageGen as BaseImageGen, ImageGenPropsWithChildren } from 'ai-jsx/core/image-gen';
import ResultContainer from '../ResultContainer.tsx';
import InputPrompt from '../InputPrompt.tsx';

export function Header({ children }: { children: ReactNode }) {
  return <h1 className="text-base font-semibold">{children}</h1>;
}
export function Paragraph({ children }: { children: ReactNode }) {
  return <p className="text-base">{children}</p>;
}

export function Container({ children }: { children: ReactNode }) {
  return <div className="container">{children}</div>;
}

export function ImageGen(props: ImageGenPropsWithChildren) {
  return (
    <BaseImageGen size="256x256" {...props}>
      A picture in the style of a children's book illustration:
      {props.children}
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
          <UICompletion
            aiComponents={[ImageGen]}
            example={
              <Container>
                <Header>Adventure in the Dark</Header>
                <ImageGen>2 people in a dark forest. The lights of a cabin can be seen from afar.</ImageGen>
                <Paragraph>Jimmy and Minny step out of the castle when all ....</Paragraph>
                <Paragraph>They knock and a the door slides open with an alarming sound.</Paragraph>
                <ImageGen>
                  Creepy cabin in the woods at night, the door is slightly open but nothing since it's dark.
                </ImageGen>
                ...
              </Container>
            }
          >
            <ChatCompletion temperature={1}>
              <Prompt persona="a fantasy fiction writer" />
              <UserMessage>
                Give me a story about {query}. Make sure to give it an interesting title. The story should have 3-5
                chapters.
              </UserMessage>
            </ChatCompletion>
            );
            {'\n'}
            Make sure to generate an image for each chapter to make it more interesting.
          </UICompletion>
        </AI.jsx>
      </ResultContainer>
    </>
  );
}
