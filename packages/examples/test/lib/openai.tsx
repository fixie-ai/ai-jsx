import * as AI from 'ai-jsx';
import { ChatCompletion } from 'ai-jsx/core/completion';
import { Shrinkable, UserMessage } from 'ai-jsx/core/conversation';
import { OpenAI } from 'ai-jsx/lib/openai';

describe('OpenAIChatModel', () => {
  it('honors the maxTokens prop', async () => {
    const ctx = AI.createRenderContext();
    const result = await ctx.render(
      <OpenAI
        chatModel="gpt-3.5-turbo"
        client={{
          ...({} as any),
          chat: {
            completions: {
              async *create(req) {
                expect(req.max_tokens).toBe(4096);
                expect(req.messages).toEqual([
                  expect.objectContaining({
                    content: 'Hello!',
                  }),
                ]);

                yield { choices: [{ delta: { role: 'assistant', content: 'Hi!' }, finish_reason: 'stop' }] };
              },
            },
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
          chat: {
            completions: {
              async *create(req) {
                expect(req.max_tokens).toBe(undefined);
                expect(req.messages).toEqual([
                  expect.objectContaining({
                    content: 'Hello!',
                  }),
                ]);

                yield { choices: [{ delta: { role: 'assistant', content: 'Hi!' } }] };
              },
            },
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
