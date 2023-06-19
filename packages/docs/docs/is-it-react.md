# Differences from React

AI.JSX is not [React](https://react.dev/), although it [seamlessly integrates with it](guides/ai-ui.md). It's more similar to [React Server Components](https://www.patterns.dev/posts/react-server-components) than [React Client Components](https://www.patterns.dev/posts/client-side-rendering).

Instead, AI.JSX is a componentized, type-safe system for composing your prompts and controlling the flow of your LLM-based app.

## React is stateful; AI.JSX is stateless

In React, your JSX becomes a stateful tree, which is mounted into the DOM. For instance:

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <>
      Count: {count}
      <button onClick={() => setCount((count) => count + 1)}>Increment</button>
    </>
  );
}
```

When you render this component, it lives in the DOM, maintaining state, and moving through a [lifecycle](https://react.dev/learn/lifecycle-of-reactive-effects).

In AI.JSX, there's no lifecycle. Your component is stateless and renders exactly once.

## AI.JSX is async / streaming native

In React, client components must be synchronous. Server components can return promises.

In AI.JSX, components can return promises, or generators:

```tsx
async function MyAsyncComponent() {
  const data = await loadData();
  const formattedData = processData(data);
  return <UserMessage>Please summarize: {formattedData}</UserMessage>;
}
```

You can embed promises directly in JSX:

```tsx
function MyAsyncComponent() {
  return <UserMessage>Please summarize: {loadData()}</UserMessage>;
}
```

For more detail, see [Rules of AI.JSX](guides/rules-of-jsx.md).

## Context is different

In React Client Components, you use `useContext` to access context.
In React Server Components, you can't use context.

In AI.JSX, there's a similar concept of [context](guides/rules-of-jsx.md#context).
