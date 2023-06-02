# Zepp Health

The LangChain version to compare this to is https://github.com/fixie-ai/Zhealth. To figure out what the expected behavior is, I mostly looked at https://github.com/fixie-ai/Zhealth/blob/main/test_zhealth.ipynb.

## Results Comparison

[Question/Answer Sample Sheet](https://docs.google.com/spreadsheets/d/1-4rF56OMsCnOVat9nTYOLhpaWG_MuAGKJG-sPtg_Z1A/edit#gid=1753098382), using the [questions from the LC version](https://github.com/fixie-ai/Zhealth/blob/main/test_zhealth.ipynb), plus some of my own.

The answers from the AI.JSX solution are on par with the answers from the LC solution; each have some mistakes. I think the LC solution's mistakes are worse; they tend to be actual crashes / returning a JSON blob to the user, whereas AI.JSX's mistakes are getting generally getting confused on the router and taking the wrong action in response to the user. (I think this can be fixed within the current paradigm.)

LangChain's response time is from 2-34 seconds, with the average looking to be around 10-20 seconds.

AI.JSX's response time is much better:

| Statistic                   | Value |
| --------------------------- | ----- |
| Count                       | 30    |
| Average duration (seconds)  | 2.253 |
| Min duration (seconds)      | 0.237 |
| Max duration (seconds)      | 6.062 |
| Variance duration (seconds) | 1.758 |

Additionally, AI.JSX streams the results by default, no extra dev work required. LangChain's default is to return a buffered all-at-once result. (I'm not sure what it would take to enable streaming.)

## Comparison

Overall, I think the AI.JSX implementation is much easier to implement and understand than the [LangChain implementation](https://github.com/fixie-ai/Zhealth/blob/main/main.py#L125).

The central LangChain abstraction being used is the `STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION` agent. It doesn't really do the right thing by default, so Larry had to manually alter the prompt:

```py
# override system prompt to change behavior
import langchain.agents.structured_chat.prompt as lc_prompt
import system_prompt as my_prompt
lc_prompt.PREFIX = my_prompt.PREFIX
lc_prompt.FORMAT_INSTRUCTIONS = my_prompt.FORMAT_INSTRUCTIONS
lc_prompt.SUFFIX = my_prompt.SUFFIX
```

The chain type also feels kinda funny. One could imagine organizing agents along the following dimensions:

- Structured vs unstructured
- Chat vs completion
- Zero shot vs few shot
- React vs not

The `STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION` agent gives us one of the permutations, and if that doesn't work for us, we're out of luck.

Combined, I think these two things indicate that the chain is the wrong abstraction. It's very high level, and if it works perfectly for your usecase, that's great. But the moment you need to change something slightly, there's not a lot of flexibility/modularity. (This reminds me of GWT.)

Conversely, AI.JSX provides a lower-level set of primitives that are more flexible.

## Specific Features I Implemented For This

### Natural Language Router

I use a router in a few places to steer the model:

```tsx
function ZeppHealth({ query }: { query: string }) {
  return (
    // The routing agent doesn't universally pick the right thing, but I think we could solve that with prompt engineering.
    <NaturalLanguageRouter query={query}>
      <Route when="the user is asking a question about your capabilities">
        I can show you your sleep data, answer questions about your sleep data, assess your sleep quality based on your
        sleep data, and provide advice to improve your sleep based on your sleep quality. Sleep quality and advice are
        based only on ISI, SSO, and SE ratings.
      </Route>
      <Route when="the user wants to know a specific stat about their sleep (ISI, SSO, or SE)">
        <ShowStat query={query} />
      </Route>
      <Route when="the user wants advice about their sleep health">
        <ShowAdvice query={query} />
      </Route>
      <Route when="the user wants to see an aggregated summary of their sleep data">
        <ShowDataSummary query={query} />
      </Route>
      <Route unmatched>I can't help with that.</Route>
    </NaturalLanguageRouter>
  );
}
```

Overall, this paradigm felt very natural to me. It takes advantage of JSX's declarative component structure, allowing us to specify routing logic and route implementation independently.

We can also see in the above example that it's trivial to have routes return either hardcoded strings or other Components.

One style of LLM programming is to throw a bunch of options at the LLM at once and hope it figures it out. My approach here is different: the Natural Language Router is an LLM call that wants the LLM to produce a single token, which indicates which route we're choosing. (Using `logit_bias` was a great way to guide the LLM.)

I suspect the former approach will be more robust/easy to program in the limit as model quality improves, but today, I think the latter approach will produce more predictable and reliable results.

### Tool Use

We define tools that are available to the agent:

```tsx
const tools: Record<string, Tool> = {
  generateChartFromTimeSeries: {
    description: 'Generate a bar chart from a time series, given x labels and y values.',
    // Tell the user how to
    parameters: z.object({
      xLabels: z.array(z.string()),
      yValues: z.array(z.number()),
    }),
    func: generateChartFromTimeSeries,
  },
  generateHistogram: {
    description: 'Generate a histogram from a list of values.',
    parameters: z.object({
      values: z.array(z.number()),
    }),
    func: generateHistogram,
  },
};
```

Then tell the agent to use them:

```tsx
<UseTools
  tools={tools}
  query={query}
  fallback={<ApologizeForBeingUnableToShowThisSummary query={query} />}
  userData={JSON.stringify(userData)}
/>
```

We use [`zod`](https://www.npmjs.com/package/zod) to define the tool schema, as does LangChain.

Note the `fallback` option we pass, and how it can be any arbitrary Component. This confirms the modularity dream that started us down this path.

After you run a command that invokes a tool, you can find the parameters in the logs:

```
$ grep 'invoking tool' -i llmx.log | yarn pino-pretty
[11:37:40.468] INFO: Invoking tool
    toolChoice: {
      "nameOfTool": "generateHistogram",
      "parameters": [
        {
          "values": [
            0.5,
            0.3,
            0.32,
            0.27,
            0.11,
            0.12,
            0.6
          ]
        }
      ],
      "responseToUser": "Here is a histogram of how long it takes you to fall asleep."
    }
```

### Eval

I made a simple component to look at a user's question, the AI's answer, and decide if the answer is good:

```tsx
<Eval query={query} answer={<ZeppHealth query={query} />} />
```

When I run this, the actual evaluations the AI gives are bad, but I think this can be fixed via prompt engineering. The evaluating AI doesn't have any context on what's expected in our product spec, so its judgment is all over the place.

## Implementation Notes

### This Paradigm Feels Good

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
      You are a tool-using agent. You previously choose to use a tool, and generated this response to the user: "
      {toolChoiceResult.responseToUser}" When you ran the tool, you got this result: "{JSON.stringify(toolResult)}"
      Using the above, provide a final response to the user.
    </SystemMessage>
  </ChatCompletion>
);
```

Because of our JSX framework, it was trivial to swap out a synchronous string literal return for another LLM call.

### Prompt Engineering

I struggled for a while to get the model to emit a JSON object with no explanatory prose suffix. At first, I tried things like `InlineCompletion` or breaking the model call down into more pieces, but they were more complicated and ultimately wouldn't work for various reasons.

Then I asked Perplexity "how can I prompt engineer to get only JSON as an output", and it immediately worked.
