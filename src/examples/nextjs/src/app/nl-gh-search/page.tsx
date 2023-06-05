import React from '../react';
import { AI, NaturalLanguageGitHubSearch } from '../ai';
import { ChatCompletion, SystemMessage, UserMessage } from '../../../../../../dist/lib/completion-components.js';
import { Suspense } from 'react';

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
    <div className="p-4 m-4">
      <h1 className="text-lg font-bold">{title}</h1>
      {description && <p>{description}</p>}
      <div className="border-black border p-4 m-4  bg-white">
        {/* <Suspense fallback={<Loading />}> */}
        {children}
        {/* </Suspense> */}
      </div>
    </div>
  );
}

export default async function Home(props) {
  const githubTopic = props.searchParams.q || 'top issues from the TypeScript repo';
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
            <UserMessage>Give me a beans recipe</UserMessage>
          </ChatCompletion>
        </AI>
      </ResultContainer>
      <ResultContainer
        title={`Natural Language GitHub Search for: "${githubTopic}"`}
        description="AI has been asked to output prose"
      >
        <AI>
          <NaturalLanguageGitHubSearch query={githubTopic} outputFormat="prose" />
        </AI>
      </ResultContainer>
      <ResultContainer
        title={`Natural Language GitHub Search for: "${githubTopic}"`}
        description="AI has been asked to output HTML, and we write it directly into the DOM. (If the AI generates something other than HTML, this could produce funky results.)"
      >
        <AI renderDirectlyIntoDOM>
          <NaturalLanguageGitHubSearch query={githubTopic} outputFormat="html" />
        </AI>
      </ResultContainer>
    </main>
  );
}
