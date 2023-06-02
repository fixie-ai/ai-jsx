# Zepp Health

The LangChain version to compare this to is https://github.com/fixie-ai/Zhealth.

## Implementation Notes

I'm finding it very easy to drop in `<ChatCompletion>` components to define my application logic. This feels like a strong vindication of the approach.

For instance, in the `InvokeTool` component, I originally had this:

```tsx
// toolChoiceResult is an object from a previous LLM generation that identifies which tool to use.
// It looks like: {name: 'generateChart', parameters: [1, 2], responseToUser: 'I generated a chart'}

// Invoke the tool
await tool.func(...toolChoiceResult.parameters);
// Tell the user what we did
return toolChoiceResult.responseToUser;
```

Then I realized that if the tool returned something, like a URL to a generated chart, we'd actually want to return that to the user. I thought, "hmm, do I need to change the return signature on this method ... how will this ripple out ... etc". Then I realized I could just have the LLM decide if/how to use the return value:

```tsx
const toolResult = await tool.func(...toolChoiceResult.parameters);

return (
  <ChatCompletion>
    <SystemMessage>
      You are a tool-using agent. You previously choose to use a tool, and generated this response to the user:
      "{toolChoiceResult.responseToUser}"
      When you ran the tool, you got this result: "{JSON.stringify(toolResult)}"
      Using the above, provide a final response to the user.
    </SystemMessage>
  </ChatCompletion>
);
```

Because of our JSX framework, it was trivial to swap out a synchronous string literal return for another LLM call. 

### Prompt Engineering

I struggled for a while to get the model to emit a JSON object with no explanatory prose suffix. At first, I tried things like `InlineCompletion` or breaking the model call down into more pieces, but they were more complicated and ultimately wouldn't work for various reasons.

Then I asked Perplexity "how can I prompt engineer to get only JSON as an output", and it immediately worked.
