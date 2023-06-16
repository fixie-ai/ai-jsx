import * as math from 'mathjs';
import { z } from 'zod';
import * as LLMx from '@fixieai/ai-jsx';
import { UseTools, Tool } from '@fixieai/ai-jsx/batteries/use-tools';
import { showInspector } from '@fixieai/ai-jsx/core/inspector';
import { ChatCompletion, ChatProvider, SystemMessage, UserMessage } from '@fixieai/ai-jsx/core/completion';
import { OpenAIChatModel } from '@fixieai/ai-jsx/lib/openai';

function App({ query }: { query: string }) {
  // const tools: Record<string, Tool> = {
  //   evaluate_expression: {
  //     description: 'Evaluates a mathematical expression',
  //     parameters: z.tuple([z.string()]),
  //     func: math.evaluate,
  //   },
  // };
  // return <UseTools tools={tools} query={query} fallback="Failed to evaluate the mathematical expression" />;
  return (<ChatCompletion>
    <SystemMessage>You are a tool that may use functions to answer a user question.</SystemMessage>
  </ChatCompletion>)
}

showInspector(<App query="How many seconds are in a century?" />)
