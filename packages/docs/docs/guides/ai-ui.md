---
sidebar_position: 4
---

# AI + UI

In traditional UI development, human engineers write deterministic code to handle every possible UI state. With "Just in Time" UI (JIT UI), human engineers produce building block components, then hand those to an AI to use in its response.

JIT UI has the advantage of being very flexible with a minimum amount of human-maintained code. However, it is slower and more error prone than fully deterministic code. We expect both these concerns to diminish and even go away completely over time as models continue to improve.

For now, we think JIT UI can be beneficial for line of business (LOB) and other internal applications. These are a good fit because the tradeoffs make sense: there isn't always enough time allocated to the creation and maintenance of these apps and because the apps have an internal audience there is more tolerance for errors and performance issues. There is tremendous benefit from being able to have the custom UI flexibility rendered based on what the user needs.

## Example: JIT UI

For example, imagine we have a recipe app, where we want the AI to construct the UI for us:

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

There are two ways to do this: [Server-Side](#server-side-ai--ui) and [Client-Side](#client-side-ai--ui-integration).

## Server-Side AI + UI

:::note Architecture Note
Applies to the [UI on the client; AI.JSX on the server](./architecture.mdx#ui-on-the-client-aijsx-on-the-server) architecture.
:::

With this pattern, you run AI.JSX on the server. AI.JSX generates a set of UI components, and renders them back into the page for you.

For an example of this, see: [nextjs-demo](https://github.com/fixie-ai/ai-jsx/tree/main/packages/nextjs-demo).

```tsx
export function RecipeGenerator({ topic }: { topic: string }) {
  const {
    // highlight-start
    /** the current value of the stream. It will be updated as new results stream in. */
    current,

    /** a fetch function you use to call your endpoint */
    fetchAI,
  } = useAIStream({ componentMap: RecipeMap });
  // highlight-end

  useEffect(() => {
    fetchAI('/recipe/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
  }, [topic]);

  return <div className="whitespace-pre-line">{current}</div>;
}
```

### How To

1. Install:
   ```console
   npm install ai-jsx
   ```
1. Create your component map. This is the set of all components the AI can use to build your UI:

   ```tsx filename=components/Recipe.tsx
   // components/Recipe.tsx

   export function Recipe() {
     /* ... */
   }
   export function RecipeTitle() {
     /* ... */
   }
   export function RecipeInstructionList() {
     /* ... */
   }
   /* ... */
   ```

   ```tsx filename=components/Recipe.map.tsx
   // components/Recipe.map.tsx

   import { makeComponentMap } from 'ai-jsx/react/map';
   import * as RecipeComponents from './Recipe';

   export default makeComponentMap(RecipeComponents);
   ```

1. Create your API endpoint. If you're using a Vercel Serverless Function, this would look like:

   ```tsx
   /** @jsxImportSource ai-jsx/react */
   import * as AI from 'ai-jsx/experimental/next';
   import { NextRequest } from 'next/server';
   import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
   import { UICompletion } from 'ai-jsx/react/completion';
   // highlight-next-line
   import RecipeMap from '@/components/Recipe.map';
   const {
     Recipe,
     RecipeTitle,
     /* ... */
   } = RecipeMap;

   export async function POST(request: NextRequest) {
     const { topic } = await request.json();

     // Use `AI.toReactStream` to convert your AI.JSX output
     // to something that can be streamed to the client.
     // highlight-next-line
     return AI.toReactStream(

       // Pass the RecipeMap so the AI knows what components are available.
       RecipeMap,

       <UICompletion
         {/* Provide an example of how you'd like the components to be used */}
         example={
           <Recipe>
             <RecipeTitle>Crème Chantilly</RecipeTitle>
             {/* ... */}
           </Recipe>
         }
       >
         {/* Provide an input prompt so the AI knows what to build UI for.
             In this case, we're making a separate AI call to generate a recipe. */}
         <ChatCompletion temperature={1}>
           <SystemMessage>You are an expert chef.</SystemMessage>
           <UserMessage>Give me a recipe for {topic}.</UserMessage>
         </ChatCompletion>
       </UICompletion>
     );
   }
   ```

1. On the client, use the `useAIStream` hook to fetch results from your API endpoint and stream them into your UI:

   ```tsx
   import { useAIStream } from 'ai-jsx/react';
   import RecipeMap from '@/components/Recipe.map';

   export function RecipeGenerator({ topic }: { topic: string }) {
     const {
       // highlight-start
       /** the current value of the stream. It will be updated as new results stream in. */
       current,

       /** a fetch function you use to call your endpoint */
       fetchAI,
     } = useAIStream({ componentMap: RecipeMap });
     // highlight-end

     useEffect(() => {
       fetchAI('/recipe/api', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ topic }),
       });
     }, [topic]);

     return <div className="whitespace-pre-line">{current}</div>;
   }
   ```

## Client-Side AI + UI Integration

:::note Architecture Note
Applies to the following architectures:

- [Run entirely on the client](./architecture.mdx#run-entirely-on-the-client)
- [UI + AI.JSX on the client; API calls on the server](./architecture.mdx#ui--aijsx-on-the-client-api-calls-on-the-server)

:::

For an example of this, see: [create-react-app-demo](https://github.com/fixie-ai/ai-jsx/tree/main/packages/create-react-app-demo).

### How To

1. Install:
   ```console
   npm install ai-jsx
   ```
1. Define your components for the AI to use:
   ```tsx
   export function Recipe() {
     /* ... */
   }
   export function RecipeTitle() {
     /* ... */
   }
   export function RecipeInstructionList() {
     /* ... */
   }
   ```
1. Use AI.JSX from within your React component:

   ```tsx
   /** @jsxImportSource ai-jsx/react */
   import * as AI from 'ai-jsx/react';
   import { UICompletion } from 'ai-jsx/react/completion';
   /** ... other imports */

   export default function RecipeWrapper() {
     const [query, setQuery] = useState('beans');

     return (
       <>
         {/* other React components can live here */}

         {/* Switch into AI.JSX */}
         {/* highlight-next-line */}
         <AI.jsx>
           <UICompletion

             {/* Give the AI an example of how to use our components. */}
             {/* highlight-next-line */}
             example={
               <Recipe>
                 <RecipeTitle>Crème Chantilly</RecipeTitle>
                 {/* ... */}
               </Recipe>
             }
           >
             {/* Provide an input prompt so the AI knows what to build UI for.
                 In this case, we're making a separate AI call to generate a recipe. */}
             {/* highlight-next-line */}
             <ChatCompletion>
               <UserMessage>Give me a recipe for {query}.</UserMessage>
             </ChatCompletion>
           </UICompletion>
         </AI.jsx>
       </>
     );
   }
   ```

### Directly Generating Strings

The above examples generate UI components. However, if all you want to do is generate a string, that works too:

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
