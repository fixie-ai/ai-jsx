# MDX Output

By default, models emit text. If you ask them to, they'll emit markdown, which is a robust, easy way to provide more structured output to your user.

To take it a step further, you can have the model emit [MDX](https://mdxjs.com/), which combines Markdown and your components:

```mdx
# Last year’s snowfall

In {year}, the snowfall was above average.
It was followed by a warm spring which caused
flood conditions in many of the nearby rivers.

<Chart year={year} color="#fcb32c" />
```

To do this, use the `MdxChatCompletion` component:

```tsx
<MdxChatCompletion usageExamples={usageExample}>
  <UserMessage>Tell me a children's story. Summarize the key characters at the end.</UserMessage>
</MdxChatCompletion>
```

[(See the examples project for a full working demo.)](https://github.com/fixie-ai/ai-jsx/blob/main/packages/examples/src/mdx.tsx)

## Telling the model which components are available

The API for `MdxChatCompletion` is the same as `ChatCompletion`, except it adds a `usageExamples` prop. That prop is an AI.JSX component that tells the model which components are available:

<!-- prettier-ignore -->
```tsx
const usageExample = (
  <>
    Use a Card to display collected information to the user. The children can be markdown. Only use the card if you have
    a logically-grouped set of information to show the user, in the context of a larger response. Generally, your entire
    response should not be a card. A card takes optional header and footer props.
    
    Example 1 of how you might use this
    component: Here's the best candidate I found:
    <Card header="Sam Smith">
      **Skills**: React, TypeScript, Node.js **Location**: Seattle, WA **Years of experience**: 5 **Availability**:
      Full-time
    </Card>
    {/* ... you may wish to add more examples */}
  </>
);
```

In that example, `Card` may refer to a real component in scope, or you can just write it out as a string:

<!-- prettier-ignore -->
```tsx
function Card({ header, footer, children }) {
  return (
    <div>
      <div className="header">{header}</div>
      <div className="content">{children}</div>
      <div className="footer">{footer}</div>
    </div>
  );
}

const usageExample = (
  <>
    {/* Reference a component in scope */}
    Here's how you use a Card: <Card>content</Card>

    {/* Just write out a string */}
    You can also use a ButtonGroup: {`<ButtonGroup labels=['Yes', 'No'] />`}
  </>
);
```

## Using the output

The output will be MDX, as a string. It will not have any import statements. If you want to render it into your UI, it's up to you to parse/compile it in some way, using the [MDX APIs](https://mdxjs.com/).
