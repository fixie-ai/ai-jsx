# Rendering

Once you assemble your AI.JSX component tree, you'll want to render it into text or UI components. The way in which components get assembled depends on your scenario and how you are using AI.JSX. By default (and to provide the best end-user experience) AI.JSX streams results from all calls you make to an LLM.

## Streaming in AI.JSX

Rendering an AI.JSX program yields a stream. You can consume the stream in one of two ways:

1. **Partial Stream (i.e. in-progress stream)** → The stream contains partial, in-progress versions of the final (full) result.
1. **Append-Only Stream (i.e. stream of deltas) ** → The stream contains individual chunks that need to be concatenated together.

By default, AI.JSX will give you partial results for the output. These two options are explored in more detail below.

### Strings vs. Streams

When you `await` the result of `render`, you get a string:

```tsx
const str = await AI.createRenderContext().render(<App />);
```

This is fine for offline processing. However, for interactive experiences where an end-user is actively waiting, you'll often prefer to get a stream of results. This enables your app to display content to your end-user as it comes in versus having a long period of time where nothing seems to be happening.

To stream like this, treat the result of `render` like a generator:

```tsx
const result = AI.createRenderContext().render(<App />);
let frameCount = 0;
for await (const frame of result) {
  console.log('got frame', frameCount++, frame);
}
```

If `Component` ultimately resolved to `hello world`, then the output might look something like this:

```
got frame 0 h
got frame 1 hell
got frame 2 hello w
got frame 3 hello wor
got frame 4 hello world
```

The exact chunking you'll get depends on the chunks emitted by the component you're rendering.

### Partial Streaming

By default, AI.JSX will return partial streams. This means that new values may be inserted anywhere in the output. For example, if you had two completions that ran in parallel, you'd see them both stream in at the same time:

```tsx
function Debater({topic, position}) { /* ... */}

function Debate({topic}) {
  return <>
    Pro: <Debater topic={topic} position='pro' />, Con: <Debater topic={topic} position='con' />
  <>
}
```

In this example, both `Debater` AI calls will stream into your final result in parallel. Imagine you stream the results like so:

```tsx
const result = AI.createRenderContext().render(<Debate topic="are beans good" />);
let frameCount = 0;
for await (const frame of result) {
  console.log('got frame', frameCount++, frame);
}
```

Your stream of results would look like:

```
got frame 0 Pro: I think, Con: We should
got frame 1 Pro: I think beans are, Con: We should never eat
got frame 2 Pro: I think beans are great, Con: We should never eat beans
```

You can see both the Pro and Con stream parts arrive in parallel.

### Append-Only Streaming

AI.JSX supports another kind of streaming: Append-Only. Just add `{ appendOnly: true }` to switch from partial to append-only streaming.

Let's take the debate example from above and render it in append-only mode:

```tsx
const result = AI.createRenderContext().render(
  <Debate topic="are beans good" />,
  // highlight-next-line
  { appendOnly: true }
);
let chunkCount = 0;
for await (const chunk of result) {
  console.log('got chunk', chunkCount++, chunk);
}
```

This produces the following chunks:

```
got chunk 0 Pro: I think
got chunk 1 beans are
got chunk 2 great
got chunk 3 , Con: We should never eat beans
```

In this output, we see that the chunks are sequential and will need to be concatenated (e.g. `+=`) to create the final output that will be displayed to our end-user.

With partial streaming, both of our debaters (i.e. Pro and Con) were able to stream in parallel. However, with append-only streaming, only one element can stream at a time. Additional elements are still processing in the background so there is no degradation of end-to-end performance.

### Constraints

If you use a `renderResult` as a generator, you can only iterate over it once:

```tsx
const result = AI.createRenderContext().render(<Debate topic="are beans good" />);
for await (const frame of result) {
  console.log(frame);
}
// highlight-start
// Error! `result` has already been iterated over.
for await (const frame of result) {
  console.log(frame);
}
// highlight-end
```

You also can't `await` it like a promise after you've iterated over it:

```tsx
const result = AI.createRenderContext().render(<Debate topic="are beans good" />);
for await (const frame of result) {
  console.log(frame);
}
// highlight-start
// Error! `result` has already been iterated over.
console.log(await result);
// highlight-end
```

## Rendering Examples in AI.JSX

Let's take a closer look at some more examples of how to do rendering. There are five examples: the first one shows how to do local debugging of your app, the next two provide more information of examples above, and the last two map to [deployment architectures](./architecture.mdx) you might be using.

### Debugging Locally in the Terminal

Use [the Inspector](../tutorial/part2-inline.md).

```tsx
import { showInspector } from 'ai-jsx/core/inspector';

function App() {
  /* ... */
}

showInspector(<App />);
```

### You Just Want a String

:::note Architectures
This applies to the following architectures:

- [Headless AI (no UI)](./architecture.mdx#architecture-5-headless-ai)
- Any other case where you just want a string.

:::

To render your component to a string:

```tsx
import * as AI from 'ai-jsx';

function App() {
  /* ... */
}

const str = await AI.createRenderContext().render(<App />);
```

### Append-only Streaming (with Vercel)

This is the best way to use AI.JSX with [Vercel's `useAI` hook](https://sdk.vercel.ai/docs).

For example, from a [Vercel Serverless Function](https://vercel.com/docs/concepts/functions/serverless-functions):

```tsx
import { toTextStream } from 'ai-jsx/stream';
import { StreamingTextResponse } from 'ai';

export async function POST(request: NextRequest) {
  const { topic } = await request.json();

  return new StreamingTextResponse(
    // highlight-next-line
    toTextStream(
      <>
        A poem about {topic}:{'\n\n'}
        <ChatCompletion temperature={1}>
          <UserMessage>Write me a poem about {topic}</UserMessage>
        </ChatCompletion>
        {'\n\n'}
        Ten facts about {topic}:{'\n\n'}
        <ChatCompletion temperature={1}>
          <UserMessage>Give me ten facts about {topic}</UserMessage>
        </ChatCompletion>
      </>
    )
  );
}
```

For more detail, see:

- [Partial streaming](#partial-streaming)
- [Append-only streaming](#append-only-streaming)

### From the Server into React

:::note Architectures
This applies to the following architectures:

- [Server-Side AI.JSX + Client UI](./architecture.mdx#architecture-3-server-side-aijsx--client-ui)

:::

Use the `useAIStream` hook to fetch content from your server endpoint:

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

See [AI + UI](./ai-ui.md#serverside-ai--ui) for more detail.

### From Client-Side React

:::note Architectures
This applies to the following architectures:

- [Client-Side Only](./architecture.mdx#architecture-1-client-side-only)
- [API Proxy](./architecture.mdx#architecture-2-api-proxy)

:::

Use the `AI.JSX` component to directly render AI-generated content into your UI:

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

See [AI + UI](./ai-ui.md#clientside-ai--ui-integration) for more detail.

## Advanced Scenarios

:::caution
Most of the time, the patterns provided in the above scenarios are all you will need. The rest of this guide covers advanced scenarios.

:::

### Rendering From a Component

When you render on the top level, you use `AI.createRenderContext()` to create a `renderContext`. When you're already within a component, the `renderContext` is passed as an argument to the component, as part of the `componentContext`.

One reason you would want to render from within a component is to take action based on what a component renders to, like validating that it's well-formed JSON:

```tsx
function App() {
  return (
    <ValidateJsonOutput>
      <ChatCompletion>
        <UserMessage>Give me a JSON object representing a character in a fantasy game.</UserMessage>
      </ChatCompletion>
    </ValidateJsonOutput>
  );
}

/**
 * Ensure the model's response is JSON.
 */
function ValidateJsonOutput({ children }, { render }): string {
  // highlight-next-line
  const rendered = await render(children);
  try {
    JSON.parse(rendered);
    return rendered;
  } catch (e) {
    throw new Error(`Could not parse model response as JSON: ${rendered}`);
  }
}
```

In this example, `ValidateJsonOutput` takes in a child, and returns a JSON result. To do that, it needs to know what the child renders to, so it uses `render`.

### Partial Rendering

:::warning Advanced
This is an advanced case that most applications won't need.
:::

By default, `render` will render the entire tree down to a string. However, you can use partial rendering if you'd like to only render some of it.

The main reason you'd want to do this is when you're writing a parent component that has knowledge of its children. For example:

- [`ChatCompletion`](../api/modules/core_completion#chatcompletion) needs all its children to ultimately be a `SystemMessage`, `UserMessage,` or `AssistantMessage`. To find those children, it uses partial rendering.
- [`NaturalLanguageRouter`](../api/modules/batteries_natural_language_router#naturallanguagerouter) needs to know what all the `Route`s are, so it uses partial rendering to find them.

To do partial rendering, pass a `stop` argument to `render`:

```tsx
const messageChildren = await render(children, {
  stop: (e) => e.tag == SystemMessage || e.tag == UserMessage || e.tag == AssistantMessage,
});
```

This approach means we can write the following, and `ChatCompletion` will be able to find all the nested `*Message` children:

```tsx
function MyUserMessages() {
  return (
    <>
      <UserMessage>first</UserMessage>
      <UserMessage>second</UserMessage>
    </>
  );
}

<ChatCompletion>
  <MyUserMessages />
  <>
    <UserMessage>third</UserMessage>
  </>
</ChatCompletion>;
```
