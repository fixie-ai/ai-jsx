import * as LLMx from 'ai-jsx';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { showInspector } from 'ai-jsx/core/inspector';

const BIG_TEXT = `Four score and seven years ago our fathers brought forth on this continent a new nation, conceived in liberty,
and dedicated to the proposition that all men are created equal.

Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure.
We are met on a great battlefield of that war. We have come to dedicate a portion of that field as a final resting place for those
who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this.

But in a larger sense we cannot dedicate, we cannot consecrate, we cannot hallow this ground. The brave men, living and dead, who
struggled here have consecrated it, far above our poor power to add or detract. The world will little note, nor long remember, what
we say here, but it can never forget what they did here. It is for us the living, rather, to be dedicated here to the unfinished work
which they who fought here have thus far so nobly advanced. It is rather for us to be here dedicated to the great task remaining before us,
that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion, that we here
highly resolve that these dead shall not have died in vain, that this nation, under God, shall have a new birth of freedom, and that
government of the people, by the people, for the people, shall not perish from the earth.`;

const tokenLen = (text: String) => text.length / 4;
const MAX_TOKEN_LEN = 250;

async function Summarizer({ children }: { children: LLMx.Node }, { render }: LLMx.ComponentContext) {
  const text = await render(children);
  if (tokenLen(text) <= MAX_TOKEN_LEN) {
    return (
      <ChatCompletion>
        <SystemMessage>
          Summarize the supplied text into a sentence. Only use the information provided in the text; DO NOT use any
          information you know about the world.
        </SystemMessage>
        <UserMessage>{text}</UserMessage>
      </ChatCompletion>
    );
  }

  return (
    <Summarizer>
      {text.split('\n\n').map((piece) => (
        <Summarizer>{piece}</Summarizer>
      ))}
    </Summarizer>
  );
}

function App() {
  return <Summarizer>{BIG_TEXT}</Summarizer>;
}

showInspector(<App />);
