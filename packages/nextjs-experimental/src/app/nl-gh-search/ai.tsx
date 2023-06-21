/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/experimental/next';
import { graphql } from '@octokit/graphql';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';

function QueryGitHub({ query }: { query: string }) {
  return (
    <ChatCompletion>
      <SystemMessage>
        You are an expert at producing GraphQL queries to look up information from the GitHub API. You only respond with
        the GraphQL itself; you never respond with explanatory prose.
      </SystemMessage>
      <UserMessage>{query}</UserMessage>
    </ChatCompletion>
  );
}

async function FetchGitHubGraphQL({ graphQLQuery }: { graphQLQuery: AI.Node }, context: AI.RenderContext) {
  const ghToken = process.env.GITHUB_TOKEN;
  if (!ghToken) {
    throw new Error('Please set the GITHUB_TOKEN environment variable.');
  }
  let cleanedQuery = await context.render(graphQLQuery);
  // We can't get the model to stop giving us backticks, so we'll just strip them out.
  if (cleanedQuery.startsWith('```')) {
    cleanedQuery = cleanedQuery.slice(3);
  }
  if (cleanedQuery.endsWith('```')) {
    cleanedQuery = cleanedQuery.slice(0, cleanedQuery.length - 3);
  }
  const response = await graphql(cleanedQuery, {
    headers: {
      authorization: `token ${ghToken}`,
    },
  });
  return JSON.stringify(response);
}

async function FormatAsHtml({ children }: { children: AI.Node }, { render }: AI.ComponentContext) {
  const html = await render(
    <ChatCompletion>
      <SystemMessage>
        You are an expert designer. The user will give you a JSON blob, and you respond with styled HTML to display it.
        Use TailwindCSS clases to style your HTML. Respond with only the HTML. Do not respond with explanatory prose.
      </SystemMessage>
      <UserMessage>{children}</UserMessage>
    </ChatCompletion>
  );

  return (
    <AI.React>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </AI.React>
  );
}

function FormatAsProse({ children }: { children: AI.Node }) {
  return (
    <ChatCompletion>
      <SystemMessage>
        You are an expert JSON interpreter. You take JSON responses from the GitHUB API and render their contents as
        clear, succint English. For instance, if you saw, {'{'}"issues": [{'{'}"id": 1234, "title": "test",
        "description": "my description"{'}'}]{'}'}, you would respond with, "Issue 1234: Test. (my description)".
      </SystemMessage>
      <UserMessage>{children}</UserMessage>
    </ChatCompletion>
  );
}

export function NaturalLanguageGitHubSearch({
  query,
  outputFormat,
}: {
  query: string;
  outputFormat: 'prose' | 'html';
}) {
  const ghResults = <FetchGitHubGraphQL graphQLQuery={<QueryGitHub query={query} />} />;

  return outputFormat == 'prose' ? (
    <FormatAsProse>{ghResults}</FormatAsProse>
  ) : (
    <FormatAsHtml>{ghResults}</FormatAsHtml>
  );
}
