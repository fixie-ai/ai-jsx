import * as math from 'mathjs';
import { z } from 'zod';
import * as LLMx from 'ai-jsx';
import { UseTools, Tool } from 'ai-jsx/batteries/use-tools';
import { showInspector } from 'ai-jsx/core/inspector';
import { LogImplementation, LogLevel, PinoLogger } from 'ai-jsx/core/log';
import { ChatCompletion, ChatProvider, SystemMessage, UserMessage, FunctionDefinition, FunctionParameter } from 'ai-jsx/core/completion';
import { OpenAIChatModel } from 'ai-jsx/lib/openai';
import { pino } from 'pino';

function App({ query }: { query: string }) {
  // const tools: Record<string, Tool> = {
  //   evaluate_expression: {
  //     description: 'Evaluates a mathematical expression',
  //     parameters: z.tuple([z.string()]),
  //     func: math.evaluate,
  //   },
  // };
  // return <UseTools tools={tools} query={query} fallback="Failed to evaluate the mathematical expression" />;
  return (
  <ChatProvider model="gpt-4-0613">
    <ChatCompletion functionDefinitions={
        [
          {
            name: "evaluate_expression",
            description: "Evaluates a mathematical expression",
            parameters: {
              expression: {
                description: "The mathematical expression to be evaluated.",
                type: "string",
                required: true,
              }
            }
          }
        ]}>
      <SystemMessage>You are a tool that may use functions to answer a user question.</SystemMessage>
      <UserMessage>{query}</UserMessage>
    </ChatCompletion>
  </ChatProvider>
  );
}

const pinoStdoutLogger = pino({
  name: 'ai-jsx',
  level: process.env.loglevel ?? 'trace',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

// showInspector(<App query="What is 2523231 * 2382382?" />)
console.log(await LLMx.createRenderContext({logger: new PinoLogger(pinoStdoutLogger)}).render(<App query="What is 2523231 * 2382382?" />));
