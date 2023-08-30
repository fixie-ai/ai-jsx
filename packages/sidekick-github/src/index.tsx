/// <reference lib="dom" />

import { Tool } from 'ai-jsx/batteries/use-tools';
import { ChatCompletion, SystemMessage, ConversationHistory } from 'ai-jsx/core/completion';
import { Sidekick } from 'ai-jsx/sidekick';

// @ts-expect-error
const ghToken = process.env.GITHUB_TOKEN;

const tools: Record<string, Tool> = {
  runGithubGraphqlQuery: {
    description: 'Run a GraphQL query against the Github API',
    parameters: {
      query: {
        description: 'The GraphQL query to run',
        type: 'string',
        required: true,
      },
    },
    func: async (query: string) => {
      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `bearer ${ghToken}`,
        },
        body: JSON.stringify({ query }),
      });
      const json = await response.json();
      return json.data;
    },
  },
};

export default function SidekickGH() {
  return (
    <Sidekick
      role="Github assistant"
      tools={tools}
    />
  );
}
