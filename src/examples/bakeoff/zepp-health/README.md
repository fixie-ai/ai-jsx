# Zepp Health

The LangChain version to compare this to is https://github.com/fixie-ai/Zhealth.

## Implementation Notes

I'm finding it very easy to drop in `<ChatCompletion>` components to define my application logic. This feels like a strong vindication of the approach.

For instance, in the `InvokeTool` component, I originally had this:

```ts

```

### Prompt Engineering

I struggled for a while to get the model to emit a JSON object with no explanatory prose suffix. At first, I tried things like `InlineCompletion` or breaking the model call down into more pieces, but they were more complicated and ultimately wouldn't work for various reasons.

Then I asked Perplexity "how can I prompt engineer to get only JSON as an output", and it immediately worked.
