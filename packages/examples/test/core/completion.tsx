import jestFetchMock from 'jest-fetch-mock';

jestFetchMock.enableFetchMocks();

// import { MockAgent, MockPool, setGlobalDispatcher } from 'undici';

// // Create a new MockAgent instance
// const agent = new MockAgent();

// // Set the global dispatcher to the MockAgent instance
// setGlobalDispatcher(agent);

// const pool = new MockPool('https://api.openai.com', { agent });

// // Intercept the API request and provide a mocked response
// pool.intercept({
//   path: '/data',
//   method: 'GET',
// }).reply(200, {
//   // Return a mocked response here
//   data: 'Mocked data',
// });


import * as AI from 'ai-jsx';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';

it('passes all function fields', async () => {
  // jest.mock(globalThis, 'fetch', () => {
  //   console.log('called fetch');
  // })


  // const openaiScope = nock('https://api.openai.com')
  // .post('/v1/chat/completions', body => {
  //   console.log('got body', body)
  //   return true;
  // })
  // .reply(200, {
  //   // Return a mocked response here
  //   choices: [
  //     {
  //       text: 'Mocked response text',
  //     },
  //   ],
  // });

  fetchMock.mockIf(/^https:\/\/api.openai.com\/v1\/chat\/completions/, async (req) => {
    console.log('hit mock', req)
    return Promise.resolve({});
  });

  const result = await AI.createRenderContext().render(
    <ChatCompletion>
      <UserMessage>Hello</UserMessage>
    </ChatCompletion>
  );
  expect(result).toEqual('fak');

  // openaiScope.done();
});
