import { trace } from '@opentelemetry/api';
import * as AI from 'ai-jsx';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';
import _ from 'lodash';
import { SimpleSpanProcessor, InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

const memoryExporter = new InMemorySpanExporter();
const tracerProvider = new NodeTracerProvider();
tracerProvider.addSpanProcessor(new SimpleSpanProcessor(memoryExporter));
trace.setGlobalTracerProvider(tracerProvider);

describe('MyFunction', () => {
  beforeEach(() => {
    memoryExporter.reset();
  });

  it('should emit a span with the correct attributes', async () => {
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
          "ai.jsx.tag": "UserMessage",
          "ai.jsx.tree": "<UserMessage @memoizedId=1>
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
          "ai.jsx.tree": "<ShrinkConversation cost={tokenCountForConversationMessage} budget={4093}>
        <UserMessage>
          {"hello"}
        </UserMessage>
      </ShrinkConversation>",
        },
        {
          "ai.jsx.result": "hello",
          "ai.jsx.result.tokenCount": 1,
          "ai.jsx.tag": "UserMessage",
          "ai.jsx.tree": "<UserMessage @memoizedId=1>
        {"hello"}
      </UserMessage>",
        },
        {
          "ai.jsx.result": "Hello! How can I assist you today?",
          "ai.jsx.result.tokenCount": 9,
          "ai.jsx.tag": "Stream",
          "ai.jsx.tree": ""▮"",
        },
        {
          "ai.jsx.result": "Hello! How can I assist you today?",
          "ai.jsx.result.tokenCount": 9,
          "ai.jsx.tag": "AssistantMessage",
          "ai.jsx.tree": "<AssistantMessage>
        {"▮"}
      </AssistantMessage>",
        },
        {
          "ai.jsx.result": "Hello! How can I assist you today?",
          "ai.jsx.result.tokenCount": 9,
          "ai.jsx.tag": "Stream",
          "ai.jsx.tree": ""Hello! How can I assist you today?"",
        },
        {
          "ai.jsx.result": "Hello! How can I assist you today?",
          "ai.jsx.result.tokenCount": 9,
          "ai.jsx.tag": "OpenAIChatModel",
          "ai.jsx.tree": "<OpenAIChatModel model="gpt-3.5-turbo">
        <UserMessage>
          {"hello"}
        </UserMessage>
      </OpenAIChatModel>",
        },
        {
          "ai.jsx.result": "Hello! How can I assist you today?",
          "ai.jsx.result.tokenCount": 9,
          "ai.jsx.tag": "AutomaticChatModel",
          "ai.jsx.tree": "<AutomaticChatModel>
        <UserMessage>
          {"hello"}
        </UserMessage>
      </AutomaticChatModel>",
        },
        {
          "ai.jsx.result": "Hello! How can I assist you today?",
          "ai.jsx.result.tokenCount": 9,
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
