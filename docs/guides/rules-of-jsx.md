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

## Handling Errors

Use an [Error Boundary](../../packages/ai-jsx/src/core/error-boundary.ts) to provide fallback values when a component throws:

```tsx
<ErrorBoundary fallback={'✅ Error was handled'}>
  <FailingComponent />
</ErrorBoundary>
```

[Error boundary example](../../packages/examples/src/errors.tsx).
