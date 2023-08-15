import { AIJSXError } from 'ai-jsx/core/errors';

test('Message is formatted as expected', () => {
  expect(new AIJSXError('message', 1000, 'user', { checkedNames: ['name1', 'name2'] }).toString())
    .toMatchInlineSnapshot(`
    "AI.JSX(1000): message.

    This may be due to a mistake in your code.
        
    Need help? 
    * Discord: https://discord.com/channels/1065011484125569147/1121125525142904862
    * Docs: https://docs.ai-jsx.com/
    * GH: https://github.com/fixie-ai/ai-jsx/issues"
  `);

  expect(new AIJSXError('message ending in .', 1000, 'user', { checkedNames: ['name1', 'name2'] }).toString())
    .toMatchInlineSnapshot(`
    "AI.JSX(1000): message ending in .

    This may be due to a mistake in your code.
        
    Need help? 
    * Discord: https://discord.com/channels/1065011484125569147/1121125525142904862
    * Docs: https://docs.ai-jsx.com/
    * GH: https://github.com/fixie-ai/ai-jsx/issues"
  `);
});
