---
sidebar_position: 4
---

# AI + UI

:::note AI + UI Support
Right now, AI and UI component integration is only supported when running [completely client-side](./architecture.mdx#run-entirely-on-the-client) or [UI + AI.JSX on the client; API calls on the server](./architecture.mdx/#ui--aijsx-on-the-client-api-calls-on-the-server). Support for other [architectures](./architecture.mdx) coming soon. ([File an issue](https://github.com/fixie-ai/ai-jsx/issues) if you'd like to vote on what we support. :smile:)
:::

We're very excited about AI.JSX's capability to seamless integrate UI and AI logic:

```tsx
/* react component */
<div>
  <AI.jsx>
    {/* AI.JSX component */}
    <ChatCompletion>
      <UserMessage>Write me a poem about {query}</UserMessage>
    </ChatCompletion>
  </AI.jsx>
</div>
```

In this example, we have UI components and AI components living side-by-side. The AI's results will be rendered into the React tree as a string.

We can also embed UI components within AI components:

```tsx
/* react component */
<div>
  <AI.jsx>
    {/* AI.JSX component */}
    <UICompletion
      example={
        /* react components */
        // highlight-start
        <Recipe>
          <RecipeTitle>Crème Chantilly</RecipeTitle>
          <RecipeIngredientList>
            <RecipeIngredientListItem>2 cups heavy cream</RecipeIngredientListItem>
          </RecipeIngredientList>
          <RecipeInstructionList>
            <RecipeInstructionListItem>Combine the ingredients in a large mixing bowl.</RecipeInstructionListItem>
          </RecipeInstructionList>
        </Recipe>
        // highlight-end
      }
    >
      <ChatCompletion>
        <SystemMessage>You are an expert chef.</SystemMessage>
        <UserMessage>Give me a recipe for {query}.</UserMessage>
      </ChatCompletion>
    </UICompletion>
  </AI.jsx>
</div>
```

In this example, we create a set of React components, then provide them to the model along with a prompt. The model decides how to use the React components to structure its result, and AI.JSX renders those components into the tree.

## Getting Started

The fastest way to get started is to start from the [Creat React App demo](https://github.com/fixie-ai/ai-jsx/tree/main/packages/create-react-app-demo). Or, you can follow these steps:

1. Install:
   ```console
   npm install ai-jsx
   ```
1. Add these lines to the top of your files that combine React and AI.JSX components:
   ```tsx
   /** @jsxImportSource ai-jsx/react */
   import * as AI from 'ai-jsx/experimental/next';
   ```
1. Ensure that your `tsconfig.json` settings are the same as what `create-next-app` generated for you. In particular, this `compileOption` needs to be set:
   ```json
   "jsx": "preserve",
   ```

Now you're ready to embed intelligence throughout your app.

## How To

Start by writing normal React:

```tsx
<div>
  <MyComponent />
  <MyContainer>
    <h2>Title</h2>
  </MyContainer>
</div>
```

When you want to add AI.JSX components, use the `AI.jsx` component:

```tsx
/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/experimental/next';

<div>
  <MyComponent />
  <MyContainer>
    <h2>Title</h2>
    // highlight-start
    <AI.jsx>
      <ChatCompletion temperature={1}>
        <UserMessage>Write me a poem about beans</UserMessage>
      </ChatCompletion>
    </AI.jsx>
    // highlight-end
  </MyContainer>
</div>;
```

:::caution AI.JSX is not React
AI.JSX is conceptually similar to, but not the same as, React. There are different (simpler) [rules of how it works](./rules-of-jsx.md).
:::

## Just-in-Time (JIT) UI

In traditional UI development, human engineers write deterministic code to handle every possible UI state. With JIT UI, human engineers produce building block components, then hand those to an AI to use in its response.

For instance, imagine a recipe app. First, we make building-block components to render different parts of the recipe, such as:

```tsx
export function RecipeInstructionList({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h2>Instructions</h2>
      <ol className="list-disc list-inside" data-test="recipe-instruction-list">
        {children}
      </ol>
    </div>
  );
}
```

Then, we provide those components to the AI, along with a prompt of what we want it to generate:

```tsx
/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/experimental/next';
import { UICompletion } from 'ai-jsx/react/completion';

/* react component */
<div>
  <AI.jsx>
    {/* AI.JSX component */}
    <UICompletion
      example={
        /* react components */
        // highlight-start
        <Recipe>
          <RecipeTitle>Crème Chantilly</RecipeTitle>
          <RecipeIngredientList>
            <RecipeIngredientListItem>2 cups heavy cream</RecipeIngredientListItem>
          </RecipeIngredientList>
          <RecipeInstructionList>
            <RecipeInstructionListItem>Combine the ingredients in a large mixing bowl.</RecipeInstructionListItem>
          </RecipeInstructionList>
        </Recipe>
        // highlight-end
      }
    >
      <ChatCompletion>
        <SystemMessage>You are an expert chef.</SystemMessage>
        <UserMessage>Give me a recipe for {query}.</UserMessage>
      </ChatCompletion>
    </UICompletion>
  </AI.jsx>
</div>;
```

### When should I use this?

JIT UI has the advantage of being very flexible with a minimum amount of human-maintained code. However, it's also slower and more error prone than fully deterministic code. (We expect both these concerns to recede over time as models continue to improve.)

So, JIT UI excels in applications like business intelligence tools for internal users. Because the users are internal, you can be more tolerant of errors / slower performance. And you benefit greatly from being able to flexibly render whatever BI query the user produces.

### How To

First, follow the [getting started](#getting-started) and [how to](#how-to) steps above.

Then, use the `UICompletion` component:

```tsx
/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/experimental/next';
import { UICompletion } from 'ai-jsx/react/completion';

function MakeRecipe() {
  return (
    <ChatCompletion>
      <SystemMessage>You are an expert chef.</SystemMessage>
      <UserMessage>Give me a recipe for {query}.</UserMessage>
    </ChatCompletion>
  );
}

<div>
  <AI.jsx>
    // highlight-next-line
    <UICompletion
      example={
        {
          /* give React components showing what you'd like your output to look like */
        }
      }
    >
      {/* Create a prompt to the model,
          generating the content it'll use the React components to show. */}
      <MakeRecipe />
    </UICompletion>
  </AI.jsx>
</div>;
```

This example has two AI calls:

1. `MakeRecipe` uses AI to generate text of a recipe.
1. `UICompletion` takes that recipe, and the example layout given in its `example` prop, and returns a React tree that shows the recipe.
