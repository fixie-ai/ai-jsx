---
sidebar_position: 7
---

# Tutorial Part 7 - Using Tools with the LLM

Large Language Models have the ability to access external data and APIs, as long as you teach
them how to do so. In this section, we'll learn how to use AI. JSX's `<UseTools>` component to
give the LLM access to external tools -- in this case, access to stock price data. This is an
extremely powerful way to build applications that use the power of the LLM to interact with
other software systems.

## `<UseTools>`

The [ `<UseTools>` ](/api/modules/batteries_use_tools#usetools)
component allows you to provide the LLM with a list of JavaScript functions that can be
invoked to perform some external action.

```tsx filename="packages/tutorial/src/tools.tsx"
const tools = {
  checkStockPrice: {
    description: 'Check the price of a stock.',
    parameters: {
      symbol: {
        description: 'The symbol of the stock to get price for.',
        type: 'string',
        required: true,
      },
    },
    func: checkStockPrice,
  },
  getHistoricalPrices: {
    description: 'Return historical prices for a stock.',
    parameters: {
      symbol: {
        description: 'The symbol of the stock to get price for.',
        type: 'string',
        required: true,
      },
    },
    func: getHistoricalPrices,
  },
};

return (
  <UseTools tools={tools} fallback="Politely explain that you cannot help.">
    <SystemMessage>You are an agent that can answer questions about stocks.</SystemMessage>
    <UserMessage>What is the current price for AAPL?</UserMessage>
  </UseTools>
);
```

Here, we are defining two tools: `checkStockPrice` and `getHistoricalPrices`. Each tool
has an associated JavaScript function (of the same name), which takes a single string
parameter, the stock symbol. With the `<UseTools>` component, we provide the list of tools
along with a query that we want the LLM to interpret with these tools at its disposal.

If we were to run this code above, we'd get something like:

```

The current price for AAPL is 187.1968.

```

## Implementing tools

The tools themselves are just JavaScript functions, which can essentially
do anything -- call an external API, access a database, or even just
return a static string. Here's the `checkStockPrice` function:

```tsx filename="packages/tutorial/src/tools.tsx"
import yahooFinance from 'yahoo-finance2';

async function checkStockPrice({ symbol }: { symbol: string }) {
  const quote = await yahooFinance.quote(symbol);
  return quote.regularMarketPrice ?? 'Unknown';
}
```

We're using the `yahoo-finance2` package to get access to price data,
and the function simply takes the stock symbol and returns the current
price.

What's kind of amazing here is that we don't need to tell the LLM how
to call the function or what parameters to invoke it with -- the LLM
essentially figures this out on its own, given the description of the
tool ( `"Check the price of a stock."` ) and the query
( `"What is the current price for AAPL?"` ).

## Getting historical stock prices

The `getHistoricalPrices` tool is a bit more complicated, because it
fetches a list of prices and generates a graph:

```tsx filename="packages/tutorial/src/tools.tsx"
import asciichart from 'asciichart';

async function getHistoricalPrices({ symbol }: { symbol: string }) {
  const endTime = new Date();
  const startTime = new Date();
  startTime.setMonth(endTime.getMonth() - 1);

  const history = await yahooFinance.historical(symbol, {
    period1: startTime.toDateString(),
    period2: endTime.toDateString(),
  });
  const prices = history.map((quote) => quote.close);
  const chart = asciichart.plot(prices, { height: 10 });
  return chart;
}
```

We fetch the historical stock prices for the last month, and extract the
`close` price for the stock on each day from the result. We then use the
`asciichart` component to make a graph of the prices. Running this
with the query:

```

Show a graqh of the price of TSLA

```

We would get something like:

```

Here is the historical graph for TSLA, based on the prices retrieved from the tool:

     274.45 ┤             ╭╮
     267.12 ┤            ╭╯│╭╮
     259.79 ┤         ╭──╯ ╰╯╰╮
     252.46 ┤        ╭╯       │
     245.13 ┤       ╭╯        ╰
     237.81 ┤      ╭╯
     230.48 ┤     ╭╯
     223.15 ┤   ╭─╯
     215.82 ┤  ╭╯
     208.49 ┤╭─╯
     201.16 ┼╯

```
