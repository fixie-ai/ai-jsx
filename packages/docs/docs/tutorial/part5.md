---
sidebar_position: 5
---

# Tutorial Part 5 - Building a React App

So far, all of our tutorial examples have been running directly in Node.js, and writing
output to the console. This is fine if you're writing a server-side app only, but most
people will want to integrate AI.JSX into a React app. In this section, we'll show
how to implement a simple React app that uses AI.JSX to interface to a Large Language Model.
In this case, the app takes a prompt from the user, generates a poem based on the prompt,
and streams the LLM response back to the client.

You can check out the [full source code for this tutorial](https://github.com/fixie-ai/ai-jsx/tree/main/packages/tutorial-nextjs), and try out the [live demo](https://tutorial-nextjs-psi.vercel.app/) of the app. For this example,
we are using NextJS to build the React app, however, this approach will work with other frameworks,
including plain React and even bare HTML/JavaScript.

To deploy this app yourself, you can use Vercel:

```
$ cd ai-jsx/packages/tutorial-nextjs
$ vercel deploy
```

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

The Edge Function is implemented in the file `packages/tutorial-nextjs/src/app/api/poem/route.tsx`.

```tsx filename="packages/tutorial-nextjs/src/app/api/poem/route.tsx"
export async function POST(req: Request) {
  // Extract the 'topic' field from the JSON body of the request.
  const { topic } = await req.json();

  // toStreamResponse() converts the JSX to a stream of JSON responses that can be read
  // by the client, using `useAIStream()` from `ai-jsx/react`.
  return toStreamResponse(
    <ChatCompletion>
      <SystemMessage>
        You are an assistant who writes poems. If the user asks for anything else, politely decline.
      </SystemMessage>
      <UserMessage>Write a poem about {topic}.</UserMessage>
    </ChatCompletion>
  );
}
```

All we're doing here is extracting the `topic` field from the JSON request body, and using
a `<ChatCompletion>` component to invoke the LLM. The `toStreamResponse` function converts
the rendered output of the AI.JSX component to a stream of JSON SSE responses that can be
read by the client.

Finally, we have `doCompletion`:

## The React Client

The React client code is fairly simple. The `<Poem>` component simply invokes the Vercel
EdgeFunction, defined above, using a `fetch` call within `useEffect`.

```tsx filename="packages/tutorial-nextjs/src/app/page.tsx"
function PoemGenerator() {
  const DEFAULT_PROMPT = 'A red panda who likes to eat grapes';
  const { current, fetchAI } = useAIStream({});
  const [topic, setTopic] = useState(DEFAULT_PROMPT);

  return (
    <div style={{ width: '600px' }}>
      <textarea value={topic} onChange={(e) => setTopic(e.currentTarget.value)} style={{ width: '100%' }} />
      <br />
      <input
        type="submit"
        value="Write a poem"
        disabled={topic.trim() === ''}
        onClick={() => {
          fetchAI('/api/poem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic }),
          });
        }}
      />
      {current && <div style={{ width: '100%', whiteSpace: 'pre-line', paddingTop: '10px' }}>{current}</div>}
    </div>
  );
}
```

When the button is clicked, we send a POST request to the `/api/poem` endpoint, with
with the JSON request body containing the topic of the poem (from the text box).
As the results stream back from the edge function, the `fetchAI` hook will update
the `current` state variable, causing the poem to be rendered in real time.
