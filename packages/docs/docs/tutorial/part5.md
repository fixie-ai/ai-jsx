---
sidebar_position: 5
---

# Tutorial Part 5 - Building a React App

So far, all of our tutorial examples have been running directly in Node.js, and writing
output to the console. This is fine if you're writing a server-side app only, but most
people will want to integrate AI.JSX into a React app. In this section, we'll show
how to implement a simple React app that uses AI.JSX to interface to a Large Language Model.

You can check out the [full source code for this tutorial](https://github.com/fixie-ai/ai-jsx/tree/main/packages/tutorial-nextjs), and try out the [live demo](https://tutorial-nextjs-psi.vercel.app/) of the app. For this example,
we are using NextJS to build the React app, however, this approach will work with other frameworks,
including plain React and even bare HTML/JavaScript.

## Deployment models

There are two main ways to use AI.JSX within a React app:

1. You can run AI.JSX entirely client side, along with your client-side React code.
2. You can run AI.JSX on the server, providing a REST endpoint that your client-side
   React app invokes via the `fetch` API.

There are pros and cons of each approach. Running AI.JSX client-side means that your
OpenAI API keys and prompts will be exposed to clients, as they would need to be embedded
into the source code for your app. Running AI.JSX server-side allows you to keep the
API keys and prompts secret from the client, but means a more narrow REST interface
exists between your React code and the AI.JSX code.

**The app in this tutorial uses the second approach** -- That is, we run AI.JSX server-side,
and the client is only responsible for invoking a REST API.

## The AI.JSX Edge Function

To simplify deployment, we are using Vercel [Edge Functions](https://vercel.com/docs/concepts/functions/edge-functions) to run the AI.JSX components. This is not strictly necessary; one
could stand up a Node.js server and run AI.JSX there, but using Edge Functions makes
deployment much simpler.

The Edge Function is implemented in the file `packages/tutorial-nextjs/src/app/api/completion/route.tsx`.

```tsx filename="packages/tutorial-nextjs/src/app/api/completion/route.tsx"
/** @jsxImportSource ai-jsx/react */

import * as AI from 'ai-jsx';
import { ChatCompletion, AssistantMessage, SystemMessage, UserMessage } from 'ai-jsx/core/completion';

export const runtime = 'edge';
```

The `@jsxImportSource` directive tells the TypeScript compiler to use the `ai-jsx/react`
package for rendering JSX. This is important, because AI.JSX uses its own JSX rendering,
which is not the same as React. Without this line of code, you will hit errors when
attempting to render the AI.JSX component tree.

The line `export const runtime = 'edge'` tells Vercel that this is an Edge Function.

The actual REST endpoint is implemented in the `POST` function:

```tsx filename="packages/tutorial-nextjs/src/app/api/completion/route.tsx"
export async function POST(req: Request) {
  const request = await req.json();
  const userMessage = request.userMessage ?? '';
  const systemMessage = request.systemMessage ?? '';
  const assistantMessage = request.assistantMessage ?? '';

  const result = await doCompletion({ userMessage, systemMessage, assistantMessage });
  return new Response(result, { headers: { 'Content-Type': 'text/plain' } });
}
```

All we're doing here is extracting the `userMessage`, `systemMessage`, and `assistantMessage`
fields from the request body, and passing them to the `doCompletion` function, and returning
the result as a plain text response.

Finally, we have `doCompletion`:

```tsx filename="packages/tutorial-nextjs/src/app/api/completion/route.tsx"
async function doCompletion({
  userMessage,
  systemMessage,
  assistantMessage,
}: {
  userMessage: string;
  systemMessage: string;
  assistantMessage: string;
}) {
  const completion = (
    <ChatCompletion>
      {systemMessage && <SystemMessage>{systemMessage}</SystemMessage>}
      {userMessage && <UserMessage>{userMessage}</UserMessage>}
      {assistantMessage && <AssistantMessage>{assistantMessage}</AssistantMessage>}
    </ChatCompletion>
  );
  const renderContext = AI.createRenderContext();
  const result = await renderContext.render(completion);
  return result;
}
```

This small bit of AI.JSX code uses the {@link ChatCompletion} component to invoke the
LLM. We use `AI.createRenderContext` to create a new render context and invoke the
context to render the AI.JSX component tree to a string.

## The React Client

The React client code is fairly simple. First, we define the `<Home>` component, which
defines the top-level page for this NextJS app:

```tsx filename="packages/tutorial-nextjs/src/app/page.tsx"
export default function Home() {
  return (
    <main className={styles.main}>
      <div>
        <h2>AI.JSX Next.js App Demo</h2>
      </div>
      <div>
        <Poem about="A red panda who likes to eat grapes" />
      </div>
    </main>
  );
}
```

The `<Poem>` component simply invokes the Vercel Edge Function, defined above, using
a `fetch` call within `useEffect`.

```tsx filename="packages/tutorial-nextjs/src/app/page.tsx"
function Poem({ about }: { about: string }) {
  const [poem, setPoem] = useState('');

  useEffect(() => {
    if (poem !== '') {
      return;
    }
    const prompt = 'Write a poem about ' + about + '.';

    const doCompletion = () => {
      fetch('/api/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ userMessage: prompt }),
      })
        .then(function (response) {
          return response.text();
        })
        .then(function (data) {
          setPoem(data);
        });
    };
    doCompletion();
  }, [about, poem]);

  return poem;
}
```

We simply POST to the `/api/completion` endpoint with a JSON body containing the `userMessage`
field, get back the response as plain text, and set the `poem` state variable in the
component to the result.
