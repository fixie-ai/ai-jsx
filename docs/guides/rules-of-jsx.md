# Rules of JSX

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

Components take props as the first argument and [ComponentContext](../../packages/ai-jsx/src/index.ts) as the second:

```tsx
function MyComponent(props, componentContext) {}
```

`componentContext` contains a `render` method, which you can use to render other JSX components:

```tsx
function App() {
  return (
    <JsonOutput>
      <ChatCompletion>
        <UserMessage>Give me a JSON object representing a character in a fantasy game.</UserMessage>
      </ChatCompletion>
    </JsonOutput>
  );
}

/**
 * Interpret the model's response as JSON.
 */
function JsonOutput({ children }, { render }) {
  const rendered = await render(children);
  try {
    return JSON.parse(rendered);
  } catch (e) {
    throw new Error(`Could not parse model response as JSON: ${rendered}`);
  }
}
```

In this example, `JsonOutput` takes in a child, and returns a JSON result. To do that, it needs to know what the child renders to, so it uses `render`.

### Intermediate Results

If you'd like to see intermediate results of the render, you can pass a `map` param to the `render` method:

```tsx
let frameCount = 0;
await render(<Component />, {
  map: (frame) => console.log('got frame', frameCount++, frame);
})
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

You can also use the `map` function to map the results as they're streaming.

### Partial Rendering

By default, `render` will render the entire tree down to a string. However, you can use partial rendering if you'd like to only render some of it.

The main reason you'd want to do this is when you're writing a parent component that has knowledge of its children. For example:

- `ChatCompletion` needs all its children to ultimately be a `SystemMessage`, `UserMessage,` or `AssistantMessage`. To find those children, it uses partial rendering.
- `NaturalLanguageRouter` needs to know what all the `Route`s are, so it uses partial rendering to find them.

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

## Handling Errors

Use an [Error Boundary](../../packages/ai-jsx/src/core/error-boundary.ts) to provide fallback values when a component throws:

```tsx
<ErrorBoundary fallback={'✅ Error was handled'}>
  <FailingComponent />
</ErrorBoundary>
```

[Error boundary example](../../packages/examples/src/errors.tsx).

## Context
