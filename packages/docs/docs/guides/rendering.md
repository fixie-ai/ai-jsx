# Rendering

Once you assemble your AI.JSX component tree, you'll want to render it into text or UI components. The way you do it depends on how you're using AI.JSX.

## From clientside React

:::note Architectures
This applies to the following architectures:

- [Run entirely on the client](./architecture.mdx#run-entirely-on-the-client)
- [UI + AI.JSX on the client; API calls on the server](./architecture.mdx#ui--aijsx-on-the-client-api-calls-on-the-server)

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

## From the server into React

:::note Architectures
This applies to the following architectures:

- [UI on the client; AI.JSX on the server](./architecture.mdx#ui-on-the-client-aijsx-on-the-server)

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

## When you just want a stream of deltas

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

- [Tree streaming](#tree-streaming)
- [Append-only streaming](#append-only-streaming)

## When you just want a string

:::note Architectures
This applies to the following architectures:

- [Headless AI (no UI)](./architecture.mdx#headless-ai)
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

## When you're debugging locally on the command line

Use [the Inspector](../tutorial/part2-inline.md).

```tsx
import { showInspector } from 'ai-jsx/core/inspector';

function App() {
  /* ... */
}

showInspector(<App />);
```

## Advanced Cases

:::caution
In most cases, the above patterns are all you'll need. The rest of this doc will talk about the more advanced cases.

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

### Streaming Results

When you `await` the result of `render`, you get a string:

```tsx
const str = await AI.createRenderContext().render(<App />);
```

However, for performance, you'll often prefer to get a stream of results. To do this, treat the result of `render` like a generator:

```tsx
const result = AI.createRenderContext().render(<App />);
let frameCount = 0;
for await (const frame of result) {
  console.log('got frame', frameCount++, frame);
}
```

If `Component` ultimately resolved to `hello world`, then the `map` function might be called with:

```
got frame 0 h
got frame 1 hell
got frame 2 hello w
got frame 3 hello wor
got frame 4 hello world
```

(The exact chunking you'll get depends on the chunks emitted by the component you're rendering.)

#### Tree Streaming

By default, these streamed results are "tree streaming", meaning that new values may be inserted anywhere in the output. For example, if you had two completions that ran in parallel, you'd see them both stream in at the same time:

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

#### Append-Only Streaming

Sometimes, you want your result stream to be an append-only stream. Let's take the debate example from above and render it in append-only mode:

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

In this output, we see that each chunk is a delta, so you'll need to `+=` them yourself to create the final output.

With tree streaming, Pro and Con were able to stream in parallel. However, with append-only streaming, only one element can stream at a time. (The others are still processing in the background, so you're not losing end-to-end performance.)

#### Constraints

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

### Partial Rendering

:::warning Advanced
This is an advanced case that most people won't need.
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
