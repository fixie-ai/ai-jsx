import * as AI from 'ai-jsx';
import { UseTools } from 'ai-jsx/batteries/use-tools';
import z from 'zod';
import yahooFinance from 'yahoo-finance2';
import asciichart from 'asciichart';
import enquirer from 'enquirer';

const { prompt } = enquirer;

function StockAgent(props: { query: string }) {
  async function checkStockPrice(symbol: string) {
    const quote = await yahooFinance.quote(symbol);
    return quote.regularMarketPrice ?? 'Unknown';
  }

  async function getHistoricalPrices(symbol: string) {
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

  const tools = {
    checkStockPrice: {
      description: 'Check the price of a stock.',
      parameters: z.string(),
      func: checkStockPrice,
    },
    getHistoricalPrices: {
      description: 'Return historical prices for a stock.',
      parameters: z.string(),
      func: getHistoricalPrices,
    },
  };

  return (
    <UseTools
      tools={tools}
      fallback="Politely explain that you cannot help."
      query={'You are an agent that can answer questions about stocks.' + props.query}
    />
  );
}

const renderContext = AI.createRenderContext();

while (true) {
  const response = await prompt({
    type: 'input',
    name: 'query',
    message: 'Ask me a question about a stock (Ctrl-C to quit): ',
  });
  // @ts-expect-error
  const { query } = response;
  const answer = await renderContext.render(<StockAgent query={query} />);
  console.log(answer);
}
