# Performance

AI programming brings a new set of performance considerations. The fundamental difference is that model calls (e.g. to GPT-4) are an order of magnitude slower than traditional API calls. Generating a few sentences can take a few seconds.

The key strategies are:

- [Stream](#stream)
- [Minimize how long the output needs to be](#minimize-how-long-the-output-needs-to-be)
- [Avoid waterfalls / roundtrips](#avoid-waterfalls--roundtrips)
- [Defer execution](#defer-execution)
- Use a faster model

Fortunately, AI.JSX helps you with all of these.

## Stream

When you do a model call, you can either wait until it's fully complete before showing the user anything, or you can stream the output as it arrives. Streaming greatly improves perceived performance, and gives the user a chance to cancel the generation if it's heading down the wrong path.

By default, AI.JSX streams responses for you.

### From UI

```tsx file="app.tsx"
// React component
<ResultContainer title={`AI comes up with a recipe for ${query}`}>
  <AI.jsx>
    {/* AI.JSX components */}
    <ChatCompletion temperature={1}>
      <UserMessage>Write me a poem about {query}</UserMessage>
    </ChatCompletion>
  </AI.jsx>
</ResultContainer>
```

This will call the chat model and automatically stream the results into the DOM.

### From the API

```tsx
function MyComponent() {
  return (
    <ChatCompletion temperature={1}>
      <UserMessage>Write me a poem about dogs</UserMessage>
    </ChatCompletion>
  );
}

/** Get the partial result as it's streamed */
function handleIntermediateResult() {}

const finalResult = await AI.createRenderContext().render(<MyComponent />, {
  map: handleIntermediateResult,
});
```

For more detail, see [Intermediate Results](./rules-of-jsx.md#intermediate-results).

## Minimize how long the output needs to be

A model generation takes linearly more time as the output length increases, so the shorter your output can be, the faster it'll be. However, this inherently means the model is spending less time "thinking" about your result, [which could degrade accuracy](./brand-new.md#thinking-out-loud). You'll need to balance these tradeoffs.

For example, you may have a scenario where you instruct the model to give you output in a structured format, like JSON. If you can come up with a simpler JSON format that takes fewer characters, the model will produce it faster.

## Avoid waterfalls / roundtrips

## Defer Execution

AI.JSX's engine will maximally defer execution, giving you optimal parallelism. To take full advantage of this, avoid manual `render`s within a component:

```tsx
function StoryGenerator(props, { render }) {
  const heroName = <CharacterName role="hero" />;
  const villainName = <CharacterName role="villain" />;

  return (
    <ChatCompletion>
      <UserMessage>
        Write a story about a hero named {heroName} and a villain named named {villainName}.{heroName} should be nice.
      </UserMessage>
    </ChatCompletion>
  );
}
```

If you run this example, you'll see that you have two different `heroName`s generated, because each time you include the component in the JSX, it's a new instance. To get around this, you might reach for `render` to burn the results into a string:

```tsx
function StoryGenerator(props, { render }) {
  // Anti-pattern! Do not do this.
  // highlight-next-line
  const heroName = await render(<CharacterName role="hero" />);
  const villainName = <CharacterName role="villain" />;

  return (
    <ChatCompletion>
      <UserMessage>
        Write a story about a hero named {heroName} and a villain named named {villainName}.{heroName} should be nice.
      </UserMessage>
    </ChatCompletion>
  );
}
```

This hurts parallelism, because the `StoryGenerator` component can't be returned until both those renders complete. (And, if you had the `heroName` behind a conditional, the render might be wasted.)

Instead, use `memo`:

```tsx
import { memo } from 'ai-jsx/core/memoize';

function StoryGenerator(props, { render }) {
  // highlight-next-line
  const heroName = await memo(<CharacterName role="hero" />);
  const villainName = <CharacterName role="villain" />;

  return (
    <ChatCompletion>
      <UserMessage>
        Write a story about a hero named {heroName} and a villain named named {villainName}.{heroName} should be nice.
      </UserMessage>
    </ChatCompletion>
  );
}
```

With this approach, you're still deferring execution optimally, but you also ensure that each instance of `heroName` will resolve to the same generated result.
