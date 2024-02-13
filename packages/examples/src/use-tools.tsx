import * as math from 'mathjs';
import { Tool, UseTools } from 'ai-jsx/batteries/use-tools';
import { UserMessage, ShowConversation } from 'ai-jsx/core/conversation';
import { OpenAI } from 'ai-jsx/lib/openai';
import { showJSX } from './utils.js';

function evaluate({ expression }: { expression: string }) {
  return math.evaluate(expression);
}

function App({ query }: { query: string }) {
  const tools: Record<string, Tool> = {
    evaluate_expression: {
      description: 'Evaluates a mathematical expression',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            description: 'The mathematical expression to evaluate',
            type: 'string',
          },
        },
        required: ['expression'],
      },
      func: evaluate,
    },
  };

  return (
    <ShowConversation
      present={(msg) => {
        switch (msg.type) {
          case 'assistant':
            return (
              <>
                Assistant: {msg}
                {'\n'}
              </>
            );
          case 'functionCall':
            return (
              <>
                Function Call: {msg}
                {'\n'}
              </>
            );
          case 'functionResponse':
            return (
              <>
                Function Result: {msg}
                {'\n'}
              </>
            );
          default:
            return null;
        }
      }}
    >
      <OpenAI chatModel="gpt-3.5-turbo-1106">
        <UseTools tools={tools}>
          <UserMessage>{query}</UserMessage>
        </UseTools>
      </OpenAI>
    </ShowConversation>
  );
}

showJSX(<App query="What is 2523231 * 2382382? What about 1551234 * 874720?" />);
