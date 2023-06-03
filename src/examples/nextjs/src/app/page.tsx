import React from './react';
import { AI, NaturalLanguageGitHubSearch } from './ai';
import { ChatCompletion, SystemMessage, UserMessage } from '../../../../../dist/lib/completion-components.js';

function ResultContainer({ title, children, description }: { title: string; children: React.ReactNode; description?: string }) {
  return (
    <div className="p-4 m-4">
      <h1 className='text-lg font-bold'>{title}</h1>
      {description && <p>{description}</p>}
      <div className="border-black border p-4 m-4">
      {children}
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
      <ResultContainer title="Natural Language GitHub Search" description='AI has been asked to output prose'>
        <AI>
          <NaturalLanguageGitHubSearch query="top issues from the TypeScript repo" outputFormat="prose" />
        </AI>
      </ResultContainer>
      <ResultContainer title="Natural Language GitHub Search" description='AI has been asked to output HTML, and we write it directly into the DOM.'>
        <AI renderDirectlyIntoDOM>
          <NaturalLanguageGitHubSearch query="top issues from the TypeScript repo" outputFormat="html" />
        </AI>
      </ResultContainer>
    </main>
  );
}
