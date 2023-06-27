import * as math from 'mathjs';
import { z } from 'zod';
import { UseTools, Tool } from 'ai-jsx/batteries/use-tools';
import { showInspector } from 'ai-jsx/core/inspector';


function evaluate({ expression }: { expression: string }) {
  return math.evaluate(expression);
}


function App({ query }: { query: string }) {
  const tools: Record<string, Tool> = {
    evaluate_expression: {
      description: 'Evaluates a mathematical expression',
      parameters: {
        expression: {
          description: 'The mathematical expression to evaluate',
          type: 'string',
          required: true,
        },
      },
      func: evaluate,
    },
  };
  return <UseTools tools={tools} query={query} fallback="Failed to evaluate the mathematical expression" />;
}

showInspector(<App query="What is 2523231 * 2382382?" />);
