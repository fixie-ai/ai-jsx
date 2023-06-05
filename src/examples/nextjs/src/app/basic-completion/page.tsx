import React from '../react';
import { AI } from '../ai';
import { ChatCompletion, SystemMessage, UserMessage } from '../../../../../../dist/lib/completion-components.js';

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
      <div className="border-black border p-4 m-4 bg-white w-full">
        {/* <Suspense fallback={<Loading />}> */}
        {children}
        {/* </Suspense> */}
      </div>
    </div>
  );
}

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <ResultContainer title="AI writes a poem">
        <AI>
          <ChatCompletion temperature={1}>
            <UserMessage>Write me a poem about a bunch of wild weasels.</UserMessage>
          </ChatCompletion>
        </AI>
      </ResultContainer>
      <ResultContainer title="AI comes up with a recipe [beans]">
        <AI>
          <ChatCompletion temperature={1}>
            <UserMessage>Give me ten facts about weasels</UserMessage>
          </ChatCompletion>
        </AI>
      </ResultContainer>
    </main>
  );
}
