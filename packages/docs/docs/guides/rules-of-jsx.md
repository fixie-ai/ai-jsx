---
sidebar_position: 3
---

# Rules of AI.JSX

AI.JSX uses the familiar JSX syntax, but [it's not React](../is-it-react.md).

When you write an AI.JSX expression, you're declaratively specifying the shape of the string you want to be returned to the caller. The AI.JSX engine then evaluates your expression in parallel and streams the results.

```tsx
function App() {
  return (
    <>
      {/* Components can contain other components */}
      <Foo />
      {/* Components can have children */}
      <Bar>
        <Baz />
      </Bar>
      {/* You can put promises directly in the JSX; they will be awaited. */}
      {fs.readFile('./my-data', 'utf8')}
      {/* You can write raw strings */}
      Raw string
      {/* If you're putting in JS values, you'll want to serialize them. */}
      {JSON.stringify(myData)}
    </>
  );
}
```

## Async Components

Components can be async, or can return generators.

```tsx
function App({ query }) {
  return (
    <ChatCompletion>
      <SystemMessage>
        Answer customer questions based on their data: <CustomerData />
        Here's data about our company: <OrgData />
      </SystemMessage>
      <UserMessage>{query}</UserMessage>
    </ChatCompletion>
  );
}

async function CustomerData() {
  const accountId = await getCustomerAccount();
  return isLegacyAccount(accountId) ? fetchLegacy() : fetchModern();
}

function* OrgData() {
  yield firstData;
  yield secondData;
  yield thirdData;
}
```

## Component API

Components take props as the first argument and [`ComponentContext`](../api/interfaces/core_core.ComponentContext) as the second:

```tsx
function MyComponent(props, componentContext) {}
```

`componentContext` contains a [`render`](../api/interfaces/core_core.ComponentContext#render) method, which you can use to [render other JSX components](./rendering.md#rendering-from-a-component).

### Context

Similar to [React's `context`](https://react.dev/learn/passing-data-deeply-with-context), AI.JSX lets you set context to control values for parts of your tree.

```tsx
// Create a context with a default value of 0.
const Temperature = AI.createContext(0.0);

// Create a component that reads the context
function CharacterGenerator(props: Record<string, never>, { getContext }: AI.RenderContext) {
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

See also:

- API ([`packages/ai-jsx/src/core/core.ts`](../api/modules/core_core))
- Usage example ([`packages/examples/src/context.tsx`](https://github.com/fixie-ai/ai-jsx/blob/main/packages/examples/src/context.tsx))

## Handling Errors

Use an [`ErrorBoundary`](../api/modules/core_error_boundary) to provide fallback values when a component throws:

```tsx
<ErrorBoundary fallback={'✅ Error was handled'}>
  <FailingComponent />
</ErrorBoundary>
```

Error boundary example: ([`packages/examples/src/errors.tsx`](https://github.com/fixie-ai/ai-jsx/blob/main/packages/examples/src/errors.tsx)).

## Memoization

Imagine you have the following:

```tsx
const catName = (
  <ChatCompletion>
    <UserMessage>Give me a cat name</UserMessage>
  </ChatCompletion>
);

<ChatCompletion>
  <UserMessage>
    Give me a story about these two cats:
    {catName}
    {catName}
  </UserMessage>
</ChatCompletion>;
```

In this case, `catName` will result in two separate model calls, so you'll get two different cat names.

If this is not desired, you can wrap the component in [`memo`](../api/modules/core_memoize):

```tsx
const catName = memo(
  <ChatCompletion>
    <UserMessage>Give me a cat name</UserMessage>
  </ChatCompletion>
);
<ChatCompletion>
  <UserMessage>
    I have a cat named {catName}. Tell me a story about {catName}.
  </UserMessage>
</ChatCompletion>;
```

Now, `catName` will result in a single model call, and its value will be reused everywhere that component appears in the tree.

# See Also

- [Rendering](./rendering.md)
- [JSX Build System Considerations](./jsx.md)
