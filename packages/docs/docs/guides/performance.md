---
sidebar_position: 6
---

# Performance

:::note See Also

- [Deployment Architectures](./architecture.mdx) - Discusses the various options (and the trade-offs) for how to build and deploy your AI.JSX powered applications.
- [AI+UI](./ai-ui.md) - Learn how AI.JSX can free you up from having to sweat the details of your UI and instead have the AI generate it dynamically at runtime.

:::

AI programming brings a new set of performance considerations. The fundamental difference is that model calls (e.g. to GPT-4) are an order of magnitude slower than traditional API calls. Generating a few sentences can take a few seconds. In this guide, we will explain the key strategies you can use to improve the performance (actual and perceived) of your apps and how AI.JSX helps you along the way.

## Five Strategies for AI App Performance

The key performance strategies are:

1. [Streaming Responses](#strategy-1--streaming-responses)
1. [Minimizing Output Length](#strategy-2--minimizing-output-length)
1. [Avoiding Waterfalls + Roundtrips](#strategy-3--avoiding-waterfalls--roundtrips)
1. [Deferring Execution](#strategy-4--deferring-execution)
1. [Using a Faster Model](#strategy-5--using-a-faster-model)

:::note Performance vs. Reliability
Aside from "streaming responses", all these strategies make a trade-off between performance vs. the reliability of correctness. You'll have to find the trade-offs that make sense for your application. In general, we recommend starting with correctness, then making trade-offs for performance while keeping correctness at or above an acceptable threshold. No one cares how fast your app is if the results are bad. :smile:
:::

## Strategy #1: Streaming Responses

When you make a call to an LLM, you can either wait until the model has fully completed its response before showing the user anything, or you can stream the output as it arrives from the model. Streaming greatly improves perceived performance, and gives the user a chance to cancel the generation if it's heading down the wrong path.

:::info
By default, AI.JSX streams responses for you.
:::

### Streaming From the UI

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

### Streaming From the API

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

## Strategy #2: Minimizing Output Length

A model generation takes linearly more time as the output length increases, so the shorter your output can be, the faster the response will be completed. However, this inherently means the model is spending less time "thinking" about your result, [which could degrade accuracy](../ai-newcomers.md#thinking-out-loud). You'll need to balance these trade-offs.

For example, you may have a scenario where you instruct the model to give you output in a structured format, like JSON. If you can come up with a simpler JSON format that takes fewer characters, the model will produce it faster.

Additionally, if you know the limit of how long you want your response to be, you can set the [`max_tokens`](https://platform.openai.com/docs/api-reference/chat/create#chat/create-max_tokens) param:

```tsx
<ChatCompletion max_tokens={200}>
  <UserMessage>Write a concise summary of an imaginary movie.</UserMessage>
</ChatCompletion>
```

This forces the model to end its response within 200 tokens. If you only want short responses, this both improves your correctness, and prevents the model from droning on by producing an unwanted, lengthy response.

## Strategy #3: Avoiding Waterfalls + Roundtrips

Just like with UI engineering, waterfalls can hurt your performance. Sometimes they're unavoidable, but be mindful when introducing them.

For instance:

```tsx
function CharacterGenerator() {
  return <ChatCompletion>
    <UserMessage>Write me a profile for a fantasy character</UserMessage>
  </ChatCompletion>
}

function ToJson({children}: {AI.Node}) {
  return <ChatCompletion>
    <UserMessage>Convert this to JSON: {children}</UserMessage>
  </ChatCompletion>
}

function App() {
  return <ToJson><CharacterGenerator /></ToJson>
}
```

This is a waterfall, because the `CharacterGenerator` call needs to complete before the `ToJson` call can start.

Instead, we could combine them into a single model call:

```tsx
function CharacterGenerator() {
  return (
    <ChatCompletion>
      <SystemMessage>Respond in JSON.</SystemMessage>
      <UserMessage>Write me a profile for a fantasy character</UserMessage>
    </ChatCompletion>
  );
}
```

If you can get the model to do what you want in a single shot, that'll be more performant. However, asking the model to do more at once decreases reliability. It's more robust to split your workload into simple, discrete tasks for the model. So, there are trade-offs to balance here. You want the task size to be as complicated as the model can reliably do in a single pass, but no more complicated.

:::note What are roundtrips?
A roundtrip is when your client needs to make a connection to your backend. Depending on the quality of the user's network connection, this can have a big negative impact on performance. As a result, many performance strategies involve minimizing roundtrips.

Any clientside app can have roundtrips (calling out to APIs, etc). With AI apps, we add a new type of roundtrip: calling out to a model provider (e.g. OpenAI).

The number of roundtrips in your logic depends on how you structure your AI.JSX program. A program with many sequential calls out to a model will have more roundtrips than one that does a single shot. (Of course, unlike traditional API calls, model calls are so slow that the client/server latency is a less important contributor to the overall performance profile.)
:::

## Strategy #4: Deferring Execution

AI.JSX's engine will maximally defer execution, giving you optimal parallelism. To take full advantage of this, avoid manual `render`s within a component:

```tsx
function StoryGenerator(props, { render }) {
  const heroName = <CharacterName role="hero" />;
  const villainName = <CharacterName role="villain" />;

  return (
    <ChatCompletion>
      <UserMessage>
        Write a story about a hero named {heroName} and a villain named named {villainName}. {heroName} should be nice.
      </UserMessage>
    </ChatCompletion>
  );
}
```

If you run this example, you'll see that you have two different `heroName`s generated. This isn't what we want but happens because each time you include `{heroName}` in the JSX, a new instance is created. To get around this, you might be tempted to reach for `render` to get the name of our hero and burn the results into a string:

:::caution
This code illustrates an anti-pattern. Do not do this.
:::

```tsx
function StoryGenerator(props, { render }) {
  // Anti-pattern! Do not do this.
  // highlight-next-line
  const heroName = await render(<CharacterName role="hero" />);
  const villainName = <CharacterName role="villain" />;

  return (
    <ChatCompletion>
      <UserMessage>
        Write a story about a hero named {heroName} and a villain named named {villainName}. {heroName} should be nice.
      </UserMessage>
    </ChatCompletion>
  );
}
```

This hurts parallelism, because the `StoryGenerator` component can't be returned until both those renders complete. (And, if you had the `heroName` behind a conditional, the render might be wasted.)

:::tip
Use AI.JSX's built-in support for memoization instead.
:::

Instead, use [`memo`](/api/modules/core_memoize#memo):

```tsx
function StoryGenerator(props, { memo }) {
  // highlight-next-line
  const heroName = memo(<CharacterName role="hero" />);
  const villainName = <CharacterName role="villain" />;

  return (
    <ChatCompletion>
      <UserMessage>
        Write a story about a hero named {heroName} and a villain named named {villainName}. {heroName} should be nice.
      </UserMessage>
    </ChatCompletion>
  );
}
```

With this approach, you're still deferring execution optimally, but you also ensure that each instance of `heroName` will resolve to the same generated result.

## Strategy #5: Using a Faster Model

Different models have different performance profiles. GPT-4 is slower than GPT-3.5-Turbo, for instance. Unfortunately, the slower models tend to be more correct. So you'll have to find the trade-off that works for your app.

OpenAI's recommendation is to start with the most powerful model, get your app working, then move to faster models if it's possible to do so without sacrificing correctness.

You may also want to consider different model providers; OpenAI vs. Anthropic may have different performance and uptime profiles. AI.JSX makes it easy to switch model providers for any individual part (or the whole thing) of your app via [context](./rules-of-jsx.md#context).
