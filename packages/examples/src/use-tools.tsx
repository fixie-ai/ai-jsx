import * as math from 'mathjs';
import { Tool, UseTools } from 'ai-jsx/batteries/use-tools';
import { showInspector } from 'ai-jsx/core/inspector';
import { UserMessage, ShowConversation } from 'ai-jsx/core/conversation';

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
  return (
    <ShowConversation
      present={(msg) => {
        switch (msg.type) {
          case 'assistant':
            return (
              <>
                Assistant: {msg.element}
                {'\n'}
              </>
            );
          case 'functionCall':
            return (
              <>
                Function Call: {msg.element}
                {'\n'}
              </>
            );
          case 'functionResponse':
            return (
              <>
                Function Result: {msg.element}
                {'\n'}
              </>
            );
          default:
            return null;
        }
      }}
    >
      <UseTools showSteps tools={tools} fallback="Failed to evaluate the mathematical expression">
        <UserMessage>{query}</UserMessage>
      </UseTools>
    </ShowConversation>
  );
}

showInspector(<App query="What is 2523231 * 2382382?" />);
