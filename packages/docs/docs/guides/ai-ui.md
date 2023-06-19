# AI + UI

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
        <Recipe>
          <RecipeTitle>Crème Chantilly</RecipeTitle>
          <RecipeIngredientList>
            <RecipeIngredientListItem>2 cups heavy cream</RecipeIngredientListItem>
          </RecipeIngredientList>
          <RecipeInstructionList>
            <RecipeInstructionListItem>Combine the ingredients in a large mixing bowl.</RecipeInstructionListItem>
          </RecipeInstructionList>
        </Recipe>
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

In this example, we create a set of React components, then provide them to the model along with a prompt. The model decides how to use the React components to structure its result, and AI.JSX renders those components into the tree.

Today, we support AI.JSX integration with NextJS. Soon, we'll add support for generic React apps, and non-React frameworks. ([File an issue](https://github.com/fixie-ai/ai-jsx/issues) if you'd like to vote on what we support. :smile:)
