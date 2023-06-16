import * as math from 'mathjs';
import { z } from 'zod';
import * as LLMx from 'ai-jsx';
import { UseTools, Tool } from 'ai-jsx/batteries/use-tools';
import { showInspector } from 'ai-jsx/core/inspector';

function App({ query }: { query: string }) {
  const tools: Record<string, Tool> = {
    evaluate_expression: {
      description: 'Evaluates a mathematical expression',
      parameters: z.tuple([z.string()]),
      func: math.evaluate,
    },
  };
  return <UseTools tools={tools} query={query} fallback="Failed to evaluate the mathematical expression" />;
}

showInspector(<App query="What is 2523231 * 2382382?" />);
