import { Readable } from 'stream';

/**
 * This is a hack to let jest-fetch-mock handle response streams.
 * https://github.com/jefflau/jest-fetch-mock/issues/113#issuecomment-1445010122
 *
 * Or, we could move away from jest-fetch-mock and instead set the BASE_URL to point to a locally-running server.
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
import {
  FunctionCall,
  FunctionResponse,
  UserMessage,
  SystemMessage,
  Shrinkable,
  AssistantMessage,
} from 'ai-jsx/core/conversation';
import { OpenAI, OpenAIClient } from 'ai-jsx/lib/openai';
import { Tool } from 'ai-jsx/batteries/use-tools';
import { Anthropic } from 'ai-jsx/lib/anthropic';
import { Jsonifiable } from 'type-fest';

import { NodeSDK } from '@opentelemetry/sdk-node';
import { SimpleSpanProcessor, InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import _ from 'lodash';

afterEach(() => {
  fetchMock.resetMocks();
});

describe('OpenTelemetry', () => {
  const memoryExporter = new InMemorySpanExporter();
  const sdk = new NodeSDK({
    spanProcessor: new SimpleSpanProcessor(memoryExporter) as any,
  });
  sdk.start();

  afterAll(() => sdk.shutdown());

  beforeEach(() => {
    memoryExporter.reset();
  });

  it('should emit a span with the correct attributes', async () => {
    mockOpenAIResponse('opentel response from OpenAI');

    // Call your function that creates spans
    await AI.createRenderContext({ enableOpenTelemetry: true }).render(
      <ChatCompletion>
        <UserMessage>hello</UserMessage>
      </ChatCompletion>
    );

    const spans = memoryExporter.getFinishedSpans();
    const minimalSpans = _.map(spans, 'attributes');
    expect(minimalSpans).toMatchInlineSnapshot(`
      [
        {
          "ai.jsx.result": "[<UserMessage @memoizedId=1>
        {"hello"}
      </UserMessage>]",
          "ai.jsx.tag": "ShrinkConversation",
          "ai.jsx.tree": "<ShrinkConversation cost={cachedCost} budget={16381}>
        <UserMessage>
          {"hello"}
        </UserMessage>
      </ShrinkConversation>",
        },
        {
          "ai.jsx.result": "opentel response from OpenAI",
          "ai.jsx.tag": "Stream",
          "ai.jsx.tree": ""▮"",
        },
        {
          "ai.jsx.result": "opentel response from OpenAI",
          "ai.jsx.tag": "Stream",
          "ai.jsx.tree": ""opentel response from OpenAI"",
        },
        {
          "ai.jsx.result": "opentel response from OpenAI",
          "ai.jsx.tag": "Stream",
          "ai.jsx.tree": ""opentel response from OpenAI"",
        },
        {
          "ai.jsx.memoized": true,
          "ai.jsx.result": "opentel response from OpenAI",
          "ai.jsx.tag": "Stream",
          "ai.jsx.tree": ""opentel response from OpenAI"",
        },
        {
          "ai.jsx.completion": "[{"type":"assistant","props":{},"text":"opentel response from OpenAI","cost":10}]",
          "ai.jsx.prompt": "[{"type":"user","props":{},"text":"hello","cost":4}]",
          "ai.jsx.result": "opentel response from OpenAI",
          "ai.jsx.tag": "OpenAIChatModel",
          "ai.jsx.tree": "<OpenAIChatModel model="gpt-3.5-turbo">
        <UserMessage>
          {"hello"}
        </UserMessage>
      </OpenAIChatModel>",
          "openai.finish_reason": "stop",
        },
        {
          "ai.jsx.result": "opentel response from OpenAI",
          "ai.jsx.tag": "ChatCompletion",
          "ai.jsx.tree": "<ChatCompletion>
        <UserMessage>
          {"hello"}
        </UserMessage>
      </ChatCompletion>",
        },
      ]
    `);

    // Test with AIJSX_OPENTELEMETRY_TRACE_ALL
    memoryExporter.reset();
    process.env.AIJSX_OPENTELEMETRY_TRACE_ALL = '1';
    await AI.createRenderContext({ enableOpenTelemetry: true }).render(
      <ChatCompletion>
        <UserMessage>hello</UserMessage>
      </ChatCompletion>
    );

    expect(_.map(memoryExporter.getFinishedSpans(), 'attributes')).toMatchInlineSnapshot(`
      [
        {
          "ai.jsx.result": "[<UserMessage @memoizedId=1>
        {"hello"}
      </UserMessage>]",
          "ai.jsx.tag": "UserMessage",
          "ai.jsx.tree": "<UserMessage>
        {"hello"}
      </UserMessage>",
        },
        {
          "ai.jsx.result": "[<UserMessage @memoizedId=1>
        {"hello"}
      </UserMessage>]",
          "ai.jsx.tag": "UserMessage",
          "ai.jsx.tree": "<UserMessage @memoizedId=1>
        {"hello"}
      </UserMessage>",
        },
        {
          "ai.jsx.result": "[<UserMessage @memoizedId=1>
        {"hello"}
      </UserMessage>]",
          "ai.jsx.tag": "ShrinkConversation",
          "ai.jsx.tree": "<ShrinkConversation cost={cachedCost} budget={16381}>
        <UserMessage>
          {"hello"}
        </UserMessage>
      </ShrinkConversation>",
        },
        {
          "ai.jsx.result": "hello",
          "ai.jsx.tag": "UserMessage",
          "ai.jsx.tree": "<UserMessage @memoizedId=1>
        {"hello"}
      </UserMessage>",
        },
        {
          "ai.jsx.memoized": true,
          "ai.jsx.result": "hello",
          "ai.jsx.tag": "UserMessage",
          "ai.jsx.tree": "<UserMessage @memoizedId=1>
        {"hello"}
      </UserMessage>",
        },
        {
          "ai.jsx.result": "hello",
          "ai.jsx.tag": "UserMessage",
          "ai.jsx.tree": "<UserMessage @memoizedId=1>
        {"hello"}
      </UserMessage>",
        },
        {
          "ai.jsx.result": "opentel response from OpenAI",
          "ai.jsx.tag": "Stream",
          "ai.jsx.tree": ""▮"",
        },
        {
          "ai.jsx.result": "opentel response from OpenAI",
          "ai.jsx.tag": "AssistantMessage",
          "ai.jsx.tree": "<AssistantMessage @memoizedId=3>
        {"▮"}
      </AssistantMessage>",
        },
        {
          "ai.jsx.result": "opentel response from OpenAI",
          "ai.jsx.tag": "Stream",
          "ai.jsx.tree": ""opentel response from OpenAI"",
        },
        {
          "ai.jsx.result": "opentel response from OpenAI",
          "ai.jsx.tag": "AssistantMessage",
          "ai.jsx.tree": "<AssistantMessage @memoizedId=3>
        {"opentel response from OpenAI"}
      </AssistantMessage>",
        },
        {
          "ai.jsx.result": "[<AssistantMessage @memoizedId=3>
        {"opentel response from OpenAI"}
      </AssistantMessage>]",
          "ai.jsx.tag": "AssistantMessage",
          "ai.jsx.tree": "<AssistantMessage @memoizedId=3>
        {"opentel response from OpenAI"}
      </AssistantMessage>",
        },
        {
          "ai.jsx.result": "opentel response from OpenAI",
          "ai.jsx.tag": "Stream",
          "ai.jsx.tree": ""opentel response from OpenAI"",
        },
        {
          "ai.jsx.memoized": true,
          "ai.jsx.result": "opentel response from OpenAI",
          "ai.jsx.tag": "AssistantMessage",
          "ai.jsx.tree": "<AssistantMessage @memoizedId=3>
        {"opentel response from OpenAI"}
      </AssistantMessage>",
        },
        {
          "ai.jsx.result": "opentel response from OpenAI",
          "ai.jsx.tag": "AssistantMessage",
          "ai.jsx.tree": "<AssistantMessage @memoizedId=3>
        {"opentel response from OpenAI"}
      </AssistantMessage>",
        },
        {
          "ai.jsx.completion": "[{"type":"assistant","props":{},"text":"opentel response from OpenAI","cost":10}]",
          "ai.jsx.prompt": "[{"type":"user","props":{},"text":"hello","cost":4}]",
          "ai.jsx.result": "opentel response from OpenAI",
          "ai.jsx.tag": "OpenAIChatModel",
          "ai.jsx.tree": "<OpenAIChatModel model="gpt-3.5-turbo">
        <UserMessage>
          {"hello"}
        </UserMessage>
      </OpenAIChatModel>",
          "openai.finish_reason": "stop",
        },
        {
          "ai.jsx.result": "opentel response from OpenAI",
          "ai.jsx.tag": "AutomaticChatModel",
          "ai.jsx.tree": "<AutomaticChatModel>
        <UserMessage>
          {"hello"}
        </UserMessage>
      </AutomaticChatModel>",
        },
        {
          "ai.jsx.result": "opentel response from OpenAI",
          "ai.jsx.tag": "ChatCompletion",
          "ai.jsx.tree": "<ChatCompletion>
        <UserMessage>
          {"hello"}
        </UserMessage>
      </ChatCompletion>",
        },
      ]
    `);
  });
});

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
    )
  ).toEqual('response from OpenAI');
});

it('throws an error when a bare string is passsed as a replacement', async () => {
  mockOpenAIResponse('response from OpenAI');

  const largeString = 'a'.repeat(1e3);

  await expect(() =>
    AI.createRenderContext().render(
      <ChatCompletion maxInputTokens={1}>
        <Shrinkable replacement="bare replacement, which is invalid" importance={0}>
          <UserMessage>{largeString}</UserMessage>
        </Shrinkable>
      </ChatCompletion>
    )
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Every child of ChatCompletion render to one of: SystemMessage, UserMessage, AssistantMessage, FunctionCall, FunctionResponse. However, some components rendered to bare strings instead. Those strings are: "bare replacement, which is invalid". To fix this, wrap this content in the appropriate child type (e.g. UserMessage)."`
  );
});

describe('functions', () => {
  it('passes all function fields', async () => {
    const functions: Record<string, Tool> = {
      myFunc: {
        description: 'My function',
        parameters: {
          type: 'object',
          properties: {
            myParam: {
              description: 'My parameter',
              type: 'string',
              enum: ['option1', 'option2'],
            },
          },
          required: ['myParam'],
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
        tools: [
          {
            type: 'function',
            function: {
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
          },
        ],
      })
    );
  });

  it('supports function definitions for GPT-4-32k', async () => {
    mockOpenAIResponse('response from OpenAI');

    const functions: Record<string, Tool> = {
      myFunc: {
        description: 'My function',
        parameters: {
          type: 'object',
          properties: {
            myParam: {
              description: 'My parameter',
              type: 'string',
              enum: ['option1', 'option2'],
            },
          },
          required: ['myParam'],
        },
        func: () => undefined,
      },
    };

    const result = await AI.createRenderContext().render(
      <OpenAI chatModel="gpt-4-32k">
        <ChatCompletion functionDefinitions={functions}>
          <UserMessage>Hello</UserMessage>
        </ChatCompletion>
      </OpenAI>
    );

    expect(result).toEqual('response from OpenAI');
  });
});

describe('anthropic', () => {
  it('adapts message types correctly', async () => {
    const result = await AI.createRenderContext().render(
      <Anthropic
        chatModel="claude-3-haiku-20240307"
        client={{
          ...({} as any),
          messages: {
            ...({} as any),
            async *create(request) {
              expect(request).toMatchInlineSnapshot(`
{
  "max_tokens": 1000,
  "messages": [
    {
      "content": [
        {
          "text": "Hello",
          "type": "text",
        },
      ],
      "role": "user",
    },
    {
      "content": [
        {
          "text": "Hi there!",
          "type": "text",
        },
        {
          "text": "How are you?",
          "type": "text",
        },
      ],
      "role": "assistant",
    },
    {
      "content": [
        {
          "text": "For subsequent replies you will adhere to the following instructions: This is a system message in the middle of the conversation.",
          "type": "text",
        },
      ],
      "role": "user",
    },
    {
      "content": [
        {
          "text": "Okay, I will do that.",
          "type": "text",
        },
      ],
      "role": "assistant",
    },
    {
      "content": [
        {
          "text": "Good.",
          "type": "text",
        },
        {
          "text": "And how are you?",
          "type": "text",
        },
      ],
      "role": "user",
    },
    {
      "content": [
        {
          "text": "<function_calls>
<invoke>
<tool_name>myFunc</tool_name>
<parameters>
<myParam>option1</myParam>
</parameters>
</invoke>
</function_calls>",
          "type": "text",
        },
      ],
      "role": "assistant",
    },
    {
      "content": [
        {
          "text": "<function_results>
<result>
<tool_name>myFunc</tool_name>
<stdout>
12345
</stdout>
</invoke>
</function_results>",
          "type": "text",
        },
      ],
      "role": "user",
    },
  ],
  "model": "claude-3-haiku-20240307",
  "stop_sequences": undefined,
  "stream": true,
  "system": "This is a system message.

And this is another one.",
  "temperature": undefined,
  "top_p": undefined,
}
`);
              yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'response from Anthropic' } };
            },
          },
        }}
      >
        <ChatCompletion>
          <SystemMessage>This is a system message.</SystemMessage>
          <SystemMessage>And this is another one.</SystemMessage>
          <UserMessage>Hello</UserMessage>
          <AssistantMessage>Hi there!</AssistantMessage>
          <AssistantMessage>How are you?</AssistantMessage>
          <SystemMessage>This is a system message in the middle of the conversation.</SystemMessage>
          <UserMessage>Good.</UserMessage>
          <UserMessage>And how are you?</UserMessage>
          <FunctionCall id="tool1" name="myFunc" args={{ myParam: 'option1' }} />
          <FunctionResponse id="tool1" name="myFunc">
            12345
          </FunctionResponse>
        </ChatCompletion>
      </Anthropic>
    );
    expect(result).toEqual('response from Anthropic');
  });

  it('adapts message types correctly to the beta tools api', async () => {
    const result = await AI.createRenderContext().render(
      <Anthropic
        chatModel="claude-3-haiku-20240307"
        useBetaTools
        client={{
          ...({} as any),
          beta: {
            ...({} as any),
            tools: {
              ...({} as any),
              messages: {
                ...({} as any),
                create(request) {
                  expect(request).toMatchInlineSnapshot(`
{
  "max_tokens": 1000,
  "messages": [
    {
      "content": [
        {
          "text": "Hello",
          "type": "text",
        },
      ],
      "role": "user",
    },
    {
      "content": [
        {
          "text": "Hi there!",
          "type": "text",
        },
        {
          "text": "How are you?",
          "type": "text",
        },
      ],
      "role": "assistant",
    },
    {
      "content": [
        {
          "text": "For subsequent replies you will adhere to the following instructions: This is a system message in the middle of the conversation.",
          "type": "text",
        },
      ],
      "role": "user",
    },
    {
      "content": [
        {
          "text": "Okay, I will do that.",
          "type": "text",
        },
      ],
      "role": "assistant",
    },
    {
      "content": [
        {
          "text": "Good.",
          "type": "text",
        },
        {
          "text": "And how are you?",
          "type": "text",
        },
      ],
      "role": "user",
    },
    {
      "content": [
        {
          "id": "tool1",
          "input": {
            "myParam": "option1",
          },
          "name": "myFunc",
          "type": "tool_use",
        },
      ],
      "role": "assistant",
    },
    {
      "content": [
        {
          "content": [
            {
              "text": "12345",
              "type": "text",
            },
          ],
          "is_error": undefined,
          "tool_use_id": "tool1",
          "type": "tool_result",
        },
      ],
      "role": "user",
    },
  ],
  "model": "claude-3-haiku-20240307",
  "stop_sequences": undefined,
  "stream": false,
  "system": "This is a system message.

And this is another one.",
  "temperature": undefined,
  "tools": [
    {
      "description": "My function",
      "input_schema": {
        "type": "object",
      },
      "name": "hello",
    },
  ],
  "top_p": undefined,
}
`);
                  return Promise.resolve({
                    content: [
                      {
                        type: 'text',
                        text: 'response from Anthropic\n',
                      },
                      {
                        type: 'tool_use',
                        name: 'myFunc',
                        id: 'tool1',
                        input: {
                          myParam: 'option1',
                        },
                      },
                    ],
                  });
                },
              },
            },
          },
        }}
      >
        <ChatCompletion
          functionDefinitions={{
            hello: {
              description: 'My function',
              parameters: {
                type: 'object',
              },
            },
          }}
        >
          <SystemMessage>This is a system message.</SystemMessage>
          <SystemMessage>And this is another one.</SystemMessage>
          <UserMessage>Hello</UserMessage>
          <AssistantMessage>Hi there!</AssistantMessage>
          <AssistantMessage>How are you?</AssistantMessage>
          <SystemMessage>This is a system message in the middle of the conversation.</SystemMessage>
          <UserMessage>Good.</UserMessage>
          <UserMessage>And how are you?</UserMessage>
          <FunctionCall id="tool1" name="myFunc" args={{ myParam: 'option1' }} />
          <FunctionResponse id="tool1" name="myFunc">
            12345
          </FunctionResponse>
        </ChatCompletion>
      </Anthropic>
    );
    expect(result).toMatchInlineSnapshot(`
      "response from Anthropic
      Call function myFunc (id tool1) with {"myParam":"option1"}"
    `);
  });
});

function mockOpenAIResponse(message: string, handleRequest?: jest.MockedFn<(req: Jsonifiable) => Promise<void>>) {
  const SSE_PREFIX = 'data: ';
  const SSE_TERMINATOR = '\n\n';
  const SSE_FINAL_EVENT = '[DONE]';

  fetchMock.mockIf(
    /^https:\/\/api.openai.com\/v1\/chat\/completions/,
    // This is a hack to let jest-fetch-mock handle response streams.
    // @ts-expect-error
    async (req) => {
      handleRequest?.(await req.json());

      const stringStream = new ReadableStream({
        start(controller) {
          function sendDelta(messagePart: string) {
            const response: OpenAIClient.Chat.Completions.ChatCompletionChunk = {
              id: 'cmpl-3QJ8ZjX1J5Z5X',
              object: 'chat.completion.chunk',
              created: 1624430979,
              model: 'gpt-3.5-turbo',
              choices: [
                {
                  delta: {
                    role: 'assistant',
                    content: messagePart,
                  },
                  index: 0,
                  finish_reason: 'stop',
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
