import * as math from 'mathjs';
import { z } from 'zod';
import * as LLMx from 'ai-jsx';
import { UseTools, Tool } from 'ai-jsx/batteries/use-tools';
import { showInspector } from 'ai-jsx/core/inspector';
import { LogImplementation, LogLevel, PinoLogger } from 'ai-jsx/core/log';
import { ChatCompletion, ChatProvider, SystemMessage, UserMessage, FunctionDefinition, FunctionParameter, FunctionCall, FunctionResponse } from 'ai-jsx/core/completion';
import { OpenAIChatModel } from 'ai-jsx/lib/openai';
import { pino } from 'pino';


function ModelProducesFunctionCall({ query }: { query: string }) {
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

function ModelProducesFinalResponse({ query }: { query: string }) {
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
      <FunctionCall name="evaluate_expression" args={{expression: "2523231 * 2382382"}} />
      <FunctionResponse name="evaluate_expression">6011300116242</FunctionResponse>
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

// showInspector(<ModelProducesFunctionCall query="What is 2523231 * 2382382?" />)
showInspector(<ModelProducesFinalResponse query="What is 2523231 * 2382382?" />)
// console.log(
//   await LLMx.createRenderContext({logger: new PinoLogger(pinoStdoutLogger)}).render(
//     <App query="What is 2523231 * 2382382?" />
//   )
// );
