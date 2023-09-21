import { Tool } from 'ai-jsx/batteries/use-tools';
import { YourSidekickSystemMessage, finalSystemMessageBeforeResponse } from './system-message.js';
import { FixieCorpus } from 'ai-jsx/batteries/docs';
import { Sidekick } from 'ai-jsx/sidekick';

// This Document Collection contains information from the Git and GitHub documentation.
const FIXIE_DOC_COLLECTION_ID: string = 'b72ad16f-19fc-42d0-b053-69ab84f1e121';

if (!FIXIE_DOC_COLLECTION_ID) {
  throw new Error('Please set a FIXIE_CORPUS_ID in src/index.tsx');
}

const GH_TOKEN = process.env.GITHUB_TOKEN;
const systemMessage = <YourSidekickSystemMessage />;

const tools: Record<string, Tool> = {
  lookUpGitHubKnowledgeBase: FixieCorpus.createTool(
    FIXIE_DOC_COLLECTION_ID,
    'A tool for looking additional information to help answer the user query.'
  ),
  runGitHubGraphqlQuery: {
    description: 'Run a GraphQL query against the Github API',
    parameters: {
      query: {
        description: 'The GraphQL query to run',
        type: 'string',
        required: true,
      },
    },
    func: async ({ query }: { query: string }) => {
      // @ts-expect-error
      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `bearer ${GH_TOKEN}`,
        },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) {
        throw new Error(`GH request failed: ${response.status} ${response.statusText} ${response.body}`);
      }
      return response.text();
    },
  },
};

export default function SidekickTemplate() {
  return (
    <Sidekick
      role="GitHub assistant"
      systemMessage={systemMessage}
      tools={tools}
      finalSystemMessageBeforeResponse={finalSystemMessageBeforeResponse}
    />
  );
}
