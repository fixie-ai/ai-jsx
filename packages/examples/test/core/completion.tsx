import { Readable } from "stream";
import { CreateChatCompletionResponse } from 'openai';
import { ChatCompletionDelta } from 'ai-jsx/lib/openai'

class TempResponse extends Response {
  constructor(...args: any[]) {
    if (args[0] instanceof ReadableStream) {
      // @ts-ignore
      args[0] = Readable.from(args[0]);
    }
    super(...args);
  }
}
Object.defineProperty(global, "Response", {
  value: TempResponse,
});


import jestFetchMock from 'jest-fetch-mock';
jestFetchMock.enableFetchMocks();

import * as AI from 'ai-jsx';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';


it('passes all function fields', async () => {
  // @ts-expect-error
  fetchMock.mockIf(/^https:\/\/api.openai.com\/v1\/chat\/completions/, async (req) => {
    console.log('hit mock', await req.json())

    const stringStream = new ReadableStream({
      start(controller) {
        const textEncoder = new TextEncoder();

        const response: ChatCompletionDelta = {
          id: 'cmpl-3QJ8ZjX1J5Z5X',
          object: 'text_completion',
          created: 1624430979,
          model: 'gpt-3.5-turbo',
          choices: [{
            delta: {
              role: 'assistant',
              content: 'response from OpenAI'
            },
          }]
        }

        function enqueue(str: string) {
          controller.enqueue(str)
        }

        enqueue(`data: ${JSON.stringify(response)}\n\n`)
        enqueue(`[DONE]`)
        controller.close()
      }
    }).pipeThrough(new TextEncoderStream());

    // console.log(await streamToValues(stringStream));

    return {
      status: 200,
      body: stringStream 
    };
  });

  const result = await AI.createRenderContext().render(
    <ChatCompletion>
      <UserMessage>Hello</UserMessage>
    </ChatCompletion>
  );
  expect(result).toEqual('response from OpenAI');
});
