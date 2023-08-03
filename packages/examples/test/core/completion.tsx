import { Readable } from 'stream';

class TempResponse extends Response {
  constructor(...args: any[]) {
    if (args[0] instanceof ReadableStream) {
      // @ts-expect-error
      args[0] = Readable.from(args[0]);
    }
    super(...args);
  }
}
Object.defineProperty(global, 'Response', {
  value: TempResponse,
});

import jestFetchMock from 'jest-fetch-mock';
jestFetchMock.enableFetchMocks();

import * as AI from 'ai-jsx';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';
import { ChatCompletionDelta, SSE_FINAL_EVENT, SSE_PREFIX, SSE_TERMINATOR } from 'ai-jsx/lib/openai';
import { Tool } from 'ai-jsx/batteries/use-tools';
import { CreateChatCompletionRequest } from 'openai';

it('passes creates a chat completion', async () => {
  mockOpenAIResponse('response from OpenAI');

  const result = await AI.createRenderContext().render(
    <ChatCompletion>
      <UserMessage>Hello</UserMessage>
    </ChatCompletion>
  );
  expect(result).toEqual('response from OpenAI');
});

it('passes all function fields', async () => {
  const functions: Record<string, Tool> = {
    myFunc: {
      description: 'My function',
      parameters: {
        myParam: {
          description: 'My parameter',
          type: 'string',
          required: true,
        },
      },
      func: () => { return null; }
    }
  }


  mockOpenAIResponse('', async (req) => {
    const body: CreateChatCompletionRequest = await req.json();
    expect(body.functions?.[0]).toEqual({
      name: 'myFunc',
      description: 'My function',
      parameters: {
        type: 'object',
        required: ['myParam'],
        properties: {
          myParam: {
            type: 'string',
            description: 'My parameter',
          }
        }
      }
    })
  });

  await AI.createRenderContext().render(
    <ChatCompletion functionDefinitions={functions}>
      <UserMessage>Hello</UserMessage>
    </ChatCompletion>
  );
});

function mockOpenAIResponse(message: string, handleRequest?: (req: Request) => Promise<void>) {
  // @ts-expect-error
  fetchMock.mockIf(/^https:\/\/api.openai.com\/v1\/chat\/completions/, async (req) => {
    handleRequest?.(req);

    const stringStream = new ReadableStream({
      start(controller) {
        function sendDelta(messagePart: string) {
          const response: ChatCompletionDelta = {
            id: 'cmpl-3QJ8ZjX1J5Z5X',
            object: 'text_completion',
            created: 1624430979,
            model: 'gpt-3.5-turbo',
            choices: [
              {
                delta: {
                  role: 'assistant',
                  content: messagePart,
                },
              },
            ],
          };
          controller.enqueue(`${SSE_PREFIX}${JSON.stringify(response)}${SSE_TERMINATOR}`);
        }

        for (const char of message) {
          sendDelta(char);
        }

        controller.enqueue(SSE_FINAL_EVENT);
        controller.close();
      },
    }).pipeThrough(new TextEncoderStream());
    return {
      status: 200,
      body: stringStream,
    };
  });
}
