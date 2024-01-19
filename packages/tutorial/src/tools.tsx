import * as AI from 'ai-jsx';
import { UseTools } from 'ai-jsx/batteries/use-tools';
import yahooFinance from 'yahoo-finance2';
import asciichart from 'asciichart';
import enquirer from 'enquirer';
import { SystemMessage, UserMessage } from 'ai-jsx/core/completion';

const { prompt } = enquirer;

function StockAgent(props: { query: string }) {
  async function checkStockPrice({ symbol }: { symbol: string }) {
    const quote = await yahooFinance.quote(symbol);
    return quote.regularMarketPrice ?? 'Unknown';
  }

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

  const tools = {
    checkStockPrice: {
      description: 'Check the price of a stock.',
      parameters: {
        type: 'object' as const,
        properties: {
          symbol: {
            description: 'The symbol of the stock to get price for.',
            type: 'string' as const,
          },
        },
        required: ['symbol'],
      },
      func: checkStockPrice,
    },
    getHistoricalPrices: {
      description: 'Return historical prices for a stock.',
      parameters: {
        type: 'object' as const,
        properties: {
          symbol: {
            description: 'The stock symbol to get historical prices for.',
            type: 'string' as const,
          },
        },
        required: ['symbol'],
      },
      func: getHistoricalPrices,
    },
  };

  return (
    <UseTools tools={tools}>
      <SystemMessage>You are an agent that can answer questions about stocks.</SystemMessage>
      <UserMessage>{props.query}</UserMessage>
    </UseTools>
  );
}

const renderContext = AI.createRenderContext();

const response = await prompt({
  type: 'input',
  name: 'query',
  message: 'Ask me a question about a stock: ',
});
// @ts-expect-error
const { query } = response;
const answer = await renderContext.render(<StockAgent query={query} />);
console.log(answer);
