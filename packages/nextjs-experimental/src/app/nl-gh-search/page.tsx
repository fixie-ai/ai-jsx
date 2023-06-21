/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/experimental/next';
import ResultContainer from '@/components/ResultContainer';
import InputPrompt from '@/components/InputPrompt';
import { NaturalLanguageGitHubSearch } from './ai';

export default function Home(props: { searchParams: any }) {
  const defaultValue = 'top issues from the TypeScript repo';
  const githubTopic = props.searchParams.q || defaultValue;
  return (
    <>
      <InputPrompt label="Search the GitHub API for this topic" defaultValue={defaultValue} />
      <p className="mt-4 bg-white p-4 w-full rounded-md">
        If this page fails, it's generally because the model produced output in a shape we weren't expecting. (For
        instance, a malformed GraphQL query.)
      </p>
      <ResultContainer
        title={`Natural Language GitHub Search for: "${githubTopic}"`}
        description="AI has been asked to output prose"
      >
        <AI.jsx>
          <NaturalLanguageGitHubSearch query={githubTopic} outputFormat="prose" />
        </AI.jsx>
      </ResultContainer>
      <ResultContainer
        title={`Natural Language GitHub Search for: "${githubTopic}"`}
        description="AI has been asked to output HTML, and we write it directly into the DOM. (If the AI generates something other than HTML, this could produce funky results.)"
      >
        <AI.jsx>
          <NaturalLanguageGitHubSearch query={githubTopic} outputFormat="html" />
        </AI.jsx>
      </ResultContainer>
    </>
  );
}
