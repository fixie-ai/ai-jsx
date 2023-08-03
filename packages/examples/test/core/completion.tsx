import nock from 'nock';
import fetch from 'node-fetch';

// @ts-expect-error
globalThis.fetch = fetch;

import * as AI from 'ai-jsx';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';

it('passes all function fields', async () => {
  const openaiScope = nock('https://api.openai.com')
  .post('/v1/chat/completions', body => {
    console.log('got body', body)
    return true;
  })
  .reply(200, {
    // Return a mocked response here
    choices: [
      {
        text: 'Mocked response text',
      },
    ],
  });

  const result = await AI.createRenderContext().render(
    <ChatCompletion>
      <UserMessage>Hello</UserMessage>
    </ChatCompletion>
  );
  expect(result).toEqual('fak');

  openaiScope.done();
});
