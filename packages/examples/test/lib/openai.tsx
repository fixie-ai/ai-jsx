import * as AI from 'ai-jsx';
import { ChatCompletion } from 'ai-jsx/core/completion';
import { Shrinkable, UserMessage } from 'ai-jsx/core/conversation';
import { OpenAI, SSE_FINAL_EVENT, SSE_PREFIX, SSE_TERMINATOR } from 'ai-jsx/lib/openai';
import { Jsonifiable } from 'type-fest';

describe('OpenAIChatModel', () => {
  it('honors the maxTokens prop', async () => {
    const ctx = AI.createRenderContext();
    const result = await ctx.render(
      <OpenAI
        chatModel="gpt-3.5-turbo"
        client={{
          ...({} as any),
          createChatCompletion: async (req) => {
            expect(req.max_tokens).toBe(4096);
            expect(req.messages).toEqual([
              expect.objectContaining({
                content: 'Hello!',
              }),
            ]);

            return new Response(jsonToOpenAIStream([{ choices: [{ delta: { role: 'assistant', content: 'Hi!' } }] }]), {
              status: 200,
            });
          },
        }}
      >
        <ChatCompletion maxTokens={4096}>
          <Shrinkable importance={0} replacement={<UserMessage>Hello!</UserMessage>}>
            <UserMessage>This should be replaced</UserMessage>
          </Shrinkable>
        </ChatCompletion>
      </OpenAI>
    );

    expect(result).toBe('Hi!');
  });

  it('honors the reservedTokens prop', async () => {
    const ctx = AI.createRenderContext();
    const result = await ctx.render(
      <OpenAI
        chatModel="gpt-3.5-turbo"
        client={{
          ...({} as any),
          createChatCompletion: async (req) => {
            expect(req.max_tokens).toBe(undefined);
            expect(req.messages).toEqual([
              expect.objectContaining({
                content: 'Hello!',
              }),
            ]);

            return new Response(jsonToOpenAIStream([{ choices: [{ delta: { role: 'assistant', content: 'Hi!' } }] }]), {
              status: 200,
            });
          },
        }}
      >
        <ChatCompletion reservedTokens={4096}>
          <Shrinkable importance={0} replacement={<UserMessage>Hello!</UserMessage>}>
            <UserMessage>This should be replaced</UserMessage>
          </Shrinkable>
        </ChatCompletion>
      </OpenAI>
    );

    expect(result).toBe('Hi!');
  });
});

function jsonToOpenAIStream(messages: Jsonifiable[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const message of messages) {
        controller.enqueue(`${SSE_PREFIX}${JSON.stringify(message)}${SSE_TERMINATOR}`);
      }
      controller.enqueue(`${SSE_PREFIX}${SSE_FINAL_EVENT}`);
      controller.close();
    },
  }).pipeThrough(new TextEncoderStream());
}
