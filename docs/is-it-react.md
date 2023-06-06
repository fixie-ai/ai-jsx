# Is This React?

AI.JSX is not React, although it [seamlessly integrates with it](https://www.loom.com/share/79ca3706839049a2beaf70f75950f86f). It's more similar to [React Server Components](https://www.patterns.dev/posts/react-server-components) than [React Client Components](https://www.patterns.dev/posts/client-side-rendering).

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

## Context is different

In React Client Components, you use `useContext` to access context.
In React Server Components, you can't use context.

In AI.JSX, you take context as a second argument to your component:

```tsx
function MyComponent(props, context) {}
```

You can use context to set values for parts of the tree:

```tsx
// Create a context with a default value of 0.
const Temperature = LLMx.createContext(0.0);

// Create a component that reads the context
function CharacterGenerator(props: Record<string, never>, { getContext }: LLMx.RenderContext) {
  return (
    <Completion temperature={getContext(Temperature)}>
      Create a bio for a character in an RPG game.
    </Completion>
  );
}

showInspector(
  <>
    {/* Set the value for temperature */}
    <Temperature.Provider value={0.0}>
      🥶🥶🥶:{'\n'}
      <CharacterGenerator />
    </Temperature.Provider>

    {/* Set the value for temperature */}
    <Temperature.Provider value={2.0}>
      🔥🔥🔥:{'\n'}
      <CharacterGenerator />
    </Temperature.Provider>
  </>
```

Each instance of `CharacterGenerator` will use the context value set by its nearest `Temperature.Provider` parent.

For more detail, see [the context example](../packages/ai-jsx/src/examples/context.tsx).
