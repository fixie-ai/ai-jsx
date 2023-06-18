# Performance

AI programming brings a new set of performance considerations. The fundamental difference is that model calls (e.g. to GPT-4) are an order of magnitude slower than traditional API calls. Generating a few sentences can take a few seconds.

The key strategies are:

- [Stream](#stream)
- Minimize how long the output needs to be
- Avoid waterfalls / roundtrips
- Defer execution

Fortunately, AI.JSX helps you with all of these.

## Stream

When you do a model call, you can either wait until it's fully complete before showing the user anything, or you can stream the output as it arrives. Streaming greatly improves perceived performance, and gives the user a chance to cancel the generation if it's heading down the wrong path.

By default, AI.JSX streams responses for you.

### From UI

```tsx file="app.tsx"
{
  /* React component */
}
<ResultContainer title={`AI comes up with a recipe for ${query}`}>
  <AI.jsx>
    {/* AI.JSX components */}
    <ChatCompletion temperature={1}>
      <UserMessage>Write me a poem about {query}</UserMessage>
    </ChatCompletion>
  </AI.jsx>
</ResultContainer>;
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
