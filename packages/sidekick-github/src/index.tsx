/// <reference lib="dom" />

import { Tool } from 'ai-jsx/batteries/use-tools';
import { SystemMessage } from 'ai-jsx/core/completion';
import { Sidekick } from 'ai-jsx/sidekick';

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
    func: async ({ query }: { query: string }) => {
      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `bearer ${ghToken}`,
        },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) {
        throw new Error(`GH request failed: ${response.status} ${response.statusText} ${response.body}`);
      }
      return response.json();
    },
  },
};

const finalSystemMessageBeforeResponse = (
  <SystemMessage>
    Respond with a `Card`. If your API call produced a 4xx error, see if you can fix the request and try again.
    Otherwise: Give the user suggested next queries, using `NextStepsButton`. Only suggest things you can actually do.
    Here's an example of what the final outcome should look like:
    {`
  <NextStepsButton prompt='See more about this issue' />
  <NextStepsButton prompt='See pull requests linked to this issue' />
  `}
    When you give next steps, phrase them as things the user would say to you.
    {/* This is disregarded. */}
    Also, only give next steps that are fully actionable by you. You cannot call any write APIs, so do not make
    suggestions like `create a new issue`.
  </SystemMessage>
);

export default function SidekickGH() {
  return (
    <Sidekick
      role="Github assistant"
      tools={tools}
      finalSystemMessageBeforeResponse={finalSystemMessageBeforeResponse}
    />
  );
}
