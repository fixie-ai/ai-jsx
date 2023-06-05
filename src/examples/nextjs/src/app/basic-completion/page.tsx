import React from '../react';
import { AI } from '../ai';
import { ChatCompletion, UserMessage } from '../../../../../../dist/lib/completion-components.js';
import InputPrompt from '@/components/InputPrompt';

function ResultContainer({
  title,
  children,
  description,
}: {
  title: string;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="p-4 m-4 w-full">
      <h1 className="text-lg font-bold">{title}</h1>
      {description && <p>{description}</p>}
      <div className="border-black border p-4 m-4 bg-white w-full">{children}</div>
    </div>
  );
}

export default async function Home({ searchParams }: { searchParams: any }) {
  return (
    <>
      <InputPrompt label="Give the AI a topic" />
      <ResultContainer title="AI writes a poem">
        <AI>
          <ChatCompletion temperature={1}>
            <UserMessage>Write me a poem about {searchParams.q}</UserMessage>
          </ChatCompletion>
        </AI>
      </ResultContainer>
      <ResultContainer title="AI lists ten facts">
        <AI>
          <ChatCompletion temperature={1}>
            <UserMessage>Give me ten facts about {searchParams.q}</UserMessage>
          </ChatCompletion>
        </AI>
      </ResultContainer>
    </>
  );
}
