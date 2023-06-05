import { LLMx } from '../lib/index.ts';
import { ChatCompletion, SystemMessage, UserMessage } from '../lib/completion-components.tsx';
import { OpenAI } from '../lib/openai.tsx';
import { showInspector } from '../inspector/console.tsx';

function MultiModel() {
  const challenge = (
    <ChatCompletion>
      <SystemMessage>You respond exclusively with sentences whose words are in alphabetical order.</SystemMessage>
      <UserMessage>Tell me about a scientific discovery in the last 20 years.</UserMessage>
    </ChatCompletion>
  );

  return (
    <>
      GPT 3.5 (doesn't adhere to system message):{'\n'}
      <OpenAI completionModel="text-davinci-003" chatModel="gpt-3.5-turbo" temperature={0.0}>
        {challenge}
      </OpenAI>
      {'\n'}
      GPT 4 (adheres to system message):{'\n'}
      <OpenAI completionModel="text-davinci-003" chatModel="gpt-4" temperature={0.0}>
        {challenge}
      </OpenAI>
      {'\n'}
    </>
  );
}

showInspector(<MultiModel />);
