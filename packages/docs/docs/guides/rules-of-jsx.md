---
sidebar_position: 2
---

# Rules of AI.JSX

AI.JSX uses the familiar JSX syntax, but [it's not React](../is-it-react.md).

When you write an AI.JSX expression, you're declaratively specifying the shape of the string you want to be returned to the caller. The AI.JSX engine then evaluates your expression in parallel and streams the results.

## AI.JSX Example

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
      </SystemMessage>
      <UserMessage>{query}</UserMessage>
    </ChatCompletion>
  );
}

async function CustomerData() {
  const accountId = await getCustomerAccount();
  return isLegacyAccount(accountId) ? fetchLegacy() : fetchModern();
}
```

:::caution Edge case

Imagine you have a slow async component, which is used as a sibling of faster components:

```tsx
async function Slow() {
  await new Promise((resolve) => setTimeout(resolve, 4000));
  return 'slow result';
}

async function Fast() {
  await Promise.resolve();
  return 'fast result';
}

const app = (
  <>
    <Fast />
    <Slow />
  </>
);
```

Surprisingly, you won't get any results streamed out of `Fast` until `Slow` completes.

To solve this, return an intermediate value from `Slow`:

```tsx
async function* Slow() {
  // highlight-next-line
  yield '';

  await new Promise((resolve) => setTimeout(resolve, 4000));
  return 'slow result';
}
```

This is not ideal and we plan to improve it in the future.
:::

### Append-Only Generators

If your component is a generator, the default behavior is that each `yield`ed value replaces the previous value. For instance, imagine you have an image generation API like Midjourney that returns a series of image URLs showing the image render in progress:

```tsx
function* GenerateImage() {
  yield lowResUrl;
  /* ... */
  yield medResUrl;
  /* ... */
  yield highResUrl;
  /* ... */
  yield finalResUrl;
}
```

AI.JSX will interpret each `yield`ed value as a new value which should totally overwrite the previously-yielded values, so the caller would see a progression of increasingly high-quality images.

However, sometimes your data source will give you deltas, so replacing the previous contents doesn't make much sense. In this case, `yield` the [`AppendOnlyStream`](../api/modules/ai_jsx.core_render.md#appendonlystream) value to indicate that `yield`ed results should be interpreted as deltas:

```tsx
import * as AI from 'ai-jsx';

function* GenerateText() {
  yield AI.AppendOnlyStream;
  yield 'first c';
  yield 'hunk of te';
  yield 'xt that will';
  yield 'be combined';
  yield 'into a final output';
}
```

## Component API

Components take props as the first argument and [`ComponentContext`](../api/interfaces/ai_jsx.core_render.ComponentContext) as the second:

```tsx
function MyComponent(props, componentContext) {}
```

`componentContext` contains a [`render`](../api/interfaces/ai_jsx.core_render.ComponentContext#render) method, which you can use to [render other JSX components](./rendering.md#rendering-from-a-component).

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

- API ([`packages/ai-jsx/src/index.ts`](../api/modules/))
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

:::note Memoized Streams

If a streaming element is memoized, rendering will start with the last rendered frame rather than replaying every frame.

:::

# See Also

- [Rendering](./rendering.md)
- [JSX Build System Considerations](./jsx.md)
