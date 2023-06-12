import * as LLMx from '@fixieai/ai-jsx';
import { ChatCompletion, SystemMessage, UserMessage } from '@fixieai/ai-jsx/core/completion';
import { showInspector } from '@fixieai/ai-jsx/core/inspector';
import { OpenAI } from '@fixieai/ai-jsx/lib/openai';
import { z } from 'zod';

function App() {
  const Button = z.object({
    id: z.string(),
    text: z.string(),
  });

  const Row = z.array(Button);

  const Grid = z.array(Row);

  return (
    <OpenAI chatModel="gpt-4">
    <ChatCompletion>
      <SystemMessage>
        You are an assistant who can directly render UI to the user. When you speak to the user, your message must
        follow this grammar: Split your response into logical chunks. Each chunk must start with either
        `TEXT:` or `UI:` If the line starts with `TEXT:`, the rest of the line is plain text that will be displayed to
        the user. If the line starts with `UI:`, the rest of the line is a JSON object representing UI that will be
        shown to the user. This object should be of type `Grid`: 

          type Button = {'{'} id: string; text: string {'}'};
          type Row = Button[];
          type Grid = Row[];
        
        . This gives you
        the ability to display a grid of buttons to the user. When the user clicks a button, you'll receive a message
        telling you which they clicked. Use your ability to show buttons to help the user accomplish their goal. Don't
        make the user type out a whole response if they can just click a button instead. For example, if you the user a question with a finite set of choices, give them buttons to make those choices.
      </SystemMessage>
      <UserMessage>Let's play a game of chess</UserMessage>
    </ChatCompletion>
    </OpenAI>
  );
}

// console.log(await LLMx.createRenderContext().render(<App />));
showInspector(<App />);