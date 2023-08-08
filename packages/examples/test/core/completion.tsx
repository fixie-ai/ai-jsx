import { Readable } from 'stream';

/**
 * This is a hack to let jest-fetch-mock handle response streams.
 * https://github.com/jefflau/jest-fetch-mock/issues/113#issuecomment-1445010122
 */
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
/**
 * End hack
 */

import jestFetchMock from 'jest-fetch-mock';
/**
 * This _must_ occur before importing ai-jsx code. Otherwise, the mock won't be enabled.
 */
jestFetchMock.enableFetchMocks();

process.env.OPENAI_API_KEY = 'fake-openai-key';
process.env.ANTHROPIC_API_KEY = 'fake-anthropic-key';

import * as AI from 'ai-jsx';
import { ChatCompletion } from 'ai-jsx/core/completion';
import { UserMessage, SystemMessage, Shrinkable } from 'ai-jsx/core/conversation';
import { ChatCompletionDelta, SSE_FINAL_EVENT, SSE_PREFIX, SSE_TERMINATOR } from 'ai-jsx/lib/openai';
import { Tool } from 'ai-jsx/batteries/use-tools';

it('passes creates a chat completion', async () => {
  mockOpenAIResponse('response from OpenAI');

  const result = await AI.createRenderContext().render(
    <ChatCompletion>
      <UserMessage>Hello</UserMessage>
    </ChatCompletion>
  );
  expect(result).toEqual('response from OpenAI');
});

it('throws an error when a bare string is passsed to chat completion', async () => {
  mockOpenAIResponse('response from OpenAI');

  function Fak() {
    return 'fak';
  }

  await expect(() =>
    AI.createRenderContext().render(
      <ChatCompletion>
        <Fak />
        This should not be here
        <UserMessage>Correct</UserMessage>
      </ChatCompletion>
    )
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Every child of ChatCompletion render to one of: SystemMessage, UserMessage, AssistantMessage, FunctionCall, FunctionResponse. However, some components rendered to bare strings instead. Those strings are: "fak", "This should not be here". To fix this, wrap this content in the appropriate child type (e.g. UserMessage)."`
  );
});

it('throws an error when a string is passsed in a shrinkable to chat completion', async () => {
  mockOpenAIResponse('response from OpenAI');

  await expect(() =>
    AI.createRenderContext().render(
      <ChatCompletion>
        <Shrinkable importance={0}>Wrong</Shrinkable>
        <UserMessage>Correct</UserMessage>
      </ChatCompletion>
    )
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Every child of ChatCompletion render to one of: SystemMessage, UserMessage, AssistantMessage, FunctionCall, FunctionResponse. However, some components rendered to bare strings instead. Those strings are: "Wrong". To fix this, wrap this content in the appropriate child type (e.g. UserMessage)."`
  );
});

it('accepts conversational elements not being the top level', async () => {
  mockOpenAIResponse('response from OpenAI');

  function MySystemMessage() {
    return <SystemMessage>my system message</SystemMessage>;
  }

  expect(
    await AI.createRenderContext().render(
      <ChatCompletion>
        <MySystemMessage />
        <UserMessage>Correct</UserMessage>
      </ChatCompletion>
  )).toEqual('response from OpenAI');
});

it('throws an error when a bare string is passsed as a replacement', async () => {
  mockOpenAIResponse('response from OpenAI');

  const largeString = 'a'.repeat(1e3);

  await expect(() =>
    AI.createRenderContext().render(
      <ChatCompletion maxTokens={4000}>
        <Shrinkable replacement="bare replacement, which is invalid" importance={0}>
          <UserMessage>{largeString}</UserMessage>
        </Shrinkable>
      </ChatCompletion>
    )
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Every child of ChatCompletion render to one of: SystemMessage, UserMessage, AssistantMessage, FunctionCall, FunctionResponse. However, some components rendered to bare strings instead. Those strings are: "bare replacement, which is invalid". To fix this, wrap this content in the appropriate child type (e.g. UserMessage)."`
  );
});

it('passes all function fields', async () => {
  const functions: Record<string, Tool> = {
    myFunc: {
      description: 'My function',
      parameters: {
        myParam: {
          description: 'My parameter',
          type: 'string',
          enum: ['option1', 'option2'],
          required: true,
        },
      },
      func: () => undefined,
    },
  };

  const handleRequest = jest.fn();
  mockOpenAIResponse('', handleRequest);

  await AI.createRenderContext().render(
    <ChatCompletion functionDefinitions={functions}>
      <UserMessage>Hello</UserMessage>
    </ChatCompletion>
  );

  expect(handleRequest).toHaveBeenCalledWith(
    expect.objectContaining({
      functions: [
        {
          name: 'myFunc',
          description: 'My function',
          parameters: {
            type: 'object',
            required: ['myParam'],
            properties: {
              myParam: {
                type: 'string',
                enum: ['option1', 'option2'],
                description: 'My parameter',
              },
            },
          },
        },
      ],
    })
  );
});

function mockOpenAIResponse(message: string, handleRequest?: jest.MockedFn<(req: Request) => Promise<void>>) {
  fetchMock.mockIf(
    /^https:\/\/api.openai.com\/v1\/chat\/completions/,
    // This is a hack to let jest-fetch-mock handle response streams.
    // @ts-expect-error
    async (req) => {
      handleRequest?.(await req.json());

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
    }
  );
}
