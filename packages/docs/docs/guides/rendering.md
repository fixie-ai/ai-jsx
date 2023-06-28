# Rendering

To render your component to a string:

```tsx
import * as AI from 'ai-jsx';

function App() {
  /* ... */
}

const str = await AI.createRenderContext().render(<App />);
```

In most cases, this is all you'll need. The rest of this doc will talk about the more advanced cases.

TODO: talk about UI cases + when you need what

## Rendering From a Component

When you render on the top level, you use `AI.createRenderContext()` to create a [`renderContext`](../api/interfaces/RenderContext.md). When you're already within a component, the `renderContext` is passed as an argument to the component, as part of the [`componentContext`](../api/interfaces/ComponentContext.md).

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

## Streaming Results

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

### Tree Streaming

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

### Append-Only Streaming

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

## Partial Rendering

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
