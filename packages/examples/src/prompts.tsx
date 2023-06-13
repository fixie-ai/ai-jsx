import * as LLMx from '@fixieai/ai-jsx';
import { SystemMessage, UserMessage, ChatCompletion } from '@fixieai/ai-jsx/core/completion';
import { Prompt, PromptStepByStep } from '@fixieai/ai-jsx/core/prompts';
import { JsonChatCompletion, YamlChatCompletion } from '@fixieai/ai-jsx/core/constrained-output';
import { showInspector } from '@fixieai/ai-jsx/core/inspector';

function LogicPuzzle() {
  return (
    <ChatCompletion>
      <Prompt hhh persona="an expert logician" />
      <PromptStepByStep />
      <UserMessage>
        Johny and Matt decided to play rock-paper-scissors. They bet $1 on each game they played. Johny won three of the
        games but Matt walks away $5 richer. How many games did they play?
      </UserMessage>
    </ChatCompletion>
  );
}

function PersonaDesribeJSX() {
  return (
    <>
      What is JSX?{'\n'}A 5 year old's answer:{'\n'}
      <ChatCompletion>
        <Prompt persona="a 5 year old" />
        <UserMessage>What is JSX?</UserMessage>
      </ChatCompletion>
      {'\n\n'}A React developer's answer:{'\n'}
      <ChatCompletion>
        <Prompt persona="a React developer" />
        <UserMessage>What is JSX?</UserMessage>
      </ChatCompletion>
      {'\n\n'}
      Creator of Next.js's answer:{'\n'}
      <ChatCompletion>
        <Prompt persona="the creator of Next.js" />
        <UserMessage>What is JSX?</UserMessage>
      </ChatCompletion>
    </>
  );
}

import z from 'zod';
const mySchema = z.object({
  name: z.string(),
  luckyNumbers: z.array(z.number()),
});

mySchema.parse({ name: 'John', luckyNumbers: [1, 2, 3] });

function Validated() {
  return (
    // <ValidateOutput verbose validator={(output) => output.length > 100}>
    //   <ChatCompletion>
    //     <Prompt persona="a 5 year old" />
    //     <UserMessage>What is JSX? Respond in more than 100 characters.</UserMessage>
    //   </ChatCompletion>
    // </ValidateOutput>
    <YamlChatCompletion>
      <Prompt persona="a 5 year old" />
      <UserMessage>
        Create a random object describing an imaginary person that has a "name", "gender", and "age".
      </UserMessage>
    </YamlChatCompletion>
  );
}

function App() {
  return (
    <>
      {/* <LogicPuzzle /> */}
      {/* <PersonaDesribeJSX /> */}
      <Validated />
    </>
  );
}

showInspector(<App />);
