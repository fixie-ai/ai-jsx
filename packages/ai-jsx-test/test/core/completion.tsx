import * as AI from 'ai-jsx';
import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';

it('passes all function fields', async () => {
  const result = await AI.createRenderContext().render(<ChatCompletion>
      <UserMessage>Hello</UserMessage>
    </ChatCompletion>
  )
  expect(result).toEqual('fak')
})

