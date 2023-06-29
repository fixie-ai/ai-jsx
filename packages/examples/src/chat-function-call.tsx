import { showInspector } from 'ai-jsx/core/inspector';
import {
  ChatCompletion,
  ChatProvider,
  SystemMessage,
  UserMessage,
  FunctionCall,
  FunctionResponse,
} from 'ai-jsx/core/completion';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ModelProducesFunctionCall({ query }: { query: string }) {
  return (
    <ChatProvider model="gpt-4-0613">
      <ChatCompletion
        functionDefinitions={[
          {
            name: 'evaluate_expression',
            description: 'Evaluates a mathematical expression',
            parameters: {
              expression: {
                description: 'The mathematical expression to be evaluated.',
                type: 'string',
                required: true,
              },
            },
          },
        ]}
      >
        <SystemMessage>You are a tool that may use functions to answer a user question.</SystemMessage>
        <UserMessage>{query}</UserMessage>
      </ChatCompletion>
    </ChatProvider>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ModelProducesFinalResponse({ query }: { query: string }) {
  return (
    <ChatProvider model="gpt-4-0613">
      <ChatCompletion
        functionDefinitions={[
          {
            name: 'evaluate_expression',
            description: 'Evaluates a mathematical expression',
            parameters: {
              expression: {
                description: 'The mathematical expression to be evaluated.',
                type: 'string',
                required: true,
              },
            },
          },
        ]}
      >
        <SystemMessage>You are a tool that may use functions to answer a user question.</SystemMessage>
        <UserMessage>{query}</UserMessage>
        <FunctionCall name="evaluate_expression" args={{ expression: '2523231 * 2382382' }} />
        <FunctionResponse name="evaluate_expression">6011300116242</FunctionResponse>
      </ChatCompletion>
    </ChatProvider>
  );
}

showInspector(<ModelProducesFunctionCall query="What is 2523231 * 2382382?" />);
// showInspector(<ModelProducesFinalResponse query="What is 2523231 * 2382382?" />);
