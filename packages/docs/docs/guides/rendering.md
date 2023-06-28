# Rendering

To render your component to a string:

```tsx
import * as AI from 'ai-jsx';

function MyComponent() { /* ... */ }

const str = await AI.createRenderContext().render(<MyComponent />);
```

In most cases, this is all you'll need. The rest of this doc will talk about the more advanced cases.

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

## 