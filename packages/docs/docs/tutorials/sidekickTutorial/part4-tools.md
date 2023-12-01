---
sidebar_position: 4
---

# Part 4 - Tools

:::note What we cover in part 4
In [Part 3](./part3-systemMessage) we learned how to update the System Message for our Sidekick.

In Part 4, you will:

- Learn what tools are and how to add them to our Sidekick.
- Add a tool for using the GitHub Graphql API to our Sidekick.
- Create a fine-grained access token for GitHub so our Sidekick can answer deeper questions using the GH API.

:::

## Intro to Sidekick tools

A tool is simply a JavaScript function that can be invoked by the Sidekick when it needs some help from some external
code. Tools can essentially do anything -- fetch data from an API, perform computation, access external data, and more.
By giving your Sidekick access to tools, it is easy to extend the Sidekick's abilities.

In AI. JSX, we create a tool using the [ `Tool` class](https://docs.ai-jsx.com/api/interfaces/batteries_use_tools.Tool).
`Tool` has three parameters:

- `description`: An English description of what the tool does. This is important, because the LLM
  will use the description to decide when it should invoke the tool.
- `func`: A JavaScript function that invokes the tool and returns a response. This function
  will be evaluated as an AI. JSX component, meaning it can use all of the facilities of AI. JSX
  internally. But, it can also be a simple function.
- `parameters`: A dictionary of parameters that the tool accepts. Each parameter has the
  following fields:
  - `description`: An English description of the parameter. Again, this is important, because
    the description will be used by the LLM to format its input to the tool.
  - `type`: The type of the parameter, which can be `string`, `number`, `boolean`, `object`, or `array`.
  - `required` (optional): A boolean value indicating whether the parameter is required or not.
  - `enum` (optional): An optional list of strings indicating possible values that this parameter
    can take.

Here's a really simple example of a Tool that acts as a simple calculator that can add, subtract,
multiply, and divide two numbers:

```typescript
const calculatorTool: Tool = {
  description: 'A simple calculator',
  parameters: {
    operation: {
      description: 'The operation to perform',
      type: 'string',
      required: true,
      enum: ['add', 'subtract', 'multiply', 'divide'],
    },
    left: {
      description: 'The left operand',
      type: 'number',
      required: true,
    },
    right: {
      description: 'The right operand',
      type: 'number',
      required: true,
    },
  },
  func: ({ operation, left, right }) => {
    switch (operation) {
      case 'add':
        return left + right;
      case 'subtract':
        return left - right;
      case 'multiply':
        return left * right;
      case 'divide':
        return left / right;
    }
  },
};
```

Of course, another way to do this would be to have the Tool simply take a single `expression`
parameter that contains a string that can be evaluated as a JavaScript expression.

## Adding a tool to access the GitHub API

Apart from answering questions from GitHub's documentation, it would be great if our Sidekick
could also query the GitHub API directly. This is easy to do with a tool!

It turns out GitHub has a fairly comprehensive [GraphQL API](https://docs.github.com/en/graphql)
that can be used to access live data about code repositories, pull requests, issues, and more.
Since this API is also well-documented (and this documentation is part of the
Fixie Corpus we have created earlier), it is straightforward to add in a tool that will
query the GraphQL API directly.

We can do this by simply using the `fetch` API inside our Tool to query the GitHub GraphQL
endpoint:

```typescript
const graphQLQueryTool: Tool = {
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
    // Just use the fetch API to send the query to the GitHub GraphQL endpoint.
    // We send the `Authorization: bearer <token>` header to authenticate the request.
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
};
```

What's neat about this approach is that we don't need to do anything to interpret
the response to the GraphQL API directly. That is, the response to the GraphQL query will be some
blob of JSON data, but we don't need to do anything about that -- the LLM will take this
JSON blob in, and interpret it in the context of the user's query, and return a meaningful
response. LLMs for the win!

## Integrating the Tool with your Sidekick

Okay, so the final step is to integrate this tool with our Sidekick.

We first need to create a mapping from the individual tools we're providing to the
Sidekick to their `Tool` objects. We can do this as follows:

```typescript
const tools: Record<string, Tool> = {
  runGitHubGraphQlQuery: graphQLQueryTool,
};
```

Next, we pass this `tools` object to the `<Sidekick>` component when we create it:

```typescript
return (
  <OpenAI chatModel="gpt-4-32k">
    <Sidekick systemMessage={systemMessage} tools={tools} />
  </OpenAI>
);
```

That's it! Your Sidekick now has an extra appendage that can invoke the GitHub GraphQL API!

## Testing it out

Before you can use the GitHub GraphQL API in your Sidekick, you need to create a GitHub API
token.

You can do this at https://github.com/settings/tokens.

You **must** create a "Fine Grained" access token. Be sure to give the token
**read only** access to things you want to ask the Sidekick about -- we recommend
adding access to repository contents, issues, and pull requests, at a minimum.

Once you have the token, create a new file called `.env` and set the `GITHUB_TOKEN` environment variable to the token value. It should look something like this:

```terminal
GITHUB_TOKEN=YOUR_TOKEN_HERE
```

You also need to add the following line towards the top of your index.tsx file:

```jsx
const GH_TOKEN = process.env.GITHUB_TOKEN;
```

Now you should be able to deploy the Sidekick and ask questions of it, like:

```terminal
How many PRs are assigned me?
```

```terminal
Show me the open issues in the fixie-ai/ai-jsx repo
```

```terminal
What is my most recent pull request?
```

In each case, the Sidekick will use the LLM to formulate a query to the GitHub GraphQL API,
get back a response, and then use the LLM to generate a response.

:::warning Proceed with Caution

Giving your Sidekick read/update/delete access should not be done lightly. Data loss can occur.

:::

:::tip "Kick"-Starters

_This section provides some optional, suggested exercises you can do to go deeper with your usage of Sidekicks._

**Increase the Scope (CAUTION)**

Change the scope on your GitHub access token to let the Sidekick make changes or updates. Wire up a new function to provide this tool to the LLM and update the System Message accordingly.

**Wire up a new Tool**

Are there other APIs or tools that you use along with GitHub? Consider adding them to your Sidekick (SK). Here are a couple ideas:

- **CI/CD** → Connect with TravisCI (or another CI/CD service) to have your SK answer questions about builds or deployments.
- **Issue Tracking** → Give the SK a tool that can look up assigned issues in Jira or another tool.

:::
