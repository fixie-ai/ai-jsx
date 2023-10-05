import * as AI from 'ai-jsx';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { showInspector } from 'ai-jsx/core/inspector';
import { Node } from 'ai-jsx';

async function Show({ children }: { children: Node }, { memo, render }: AI.ComponentContext) {
  const retval = memo(children);
  console.log(await render(retval));
  console.log("-------------------------------------");
  return retval;
}

function Fancy({ children }: { children: Node }) {
  return (
    <ChatCompletion>
      <SystemMessage>
        Rewrite the user's message so that it sounds like it was written
        by an erudite scholar from the 19th century.
      </SystemMessage>
      <UserMessage>{children}</UserMessage>
    </ChatCompletion>
  );
}

function MakeCharacter({ children }: { children: Node }) {
  return (
      <ChatCompletion temperature={1}>
        <UserMessage>Write a one-paragraph bio of: {children}.</UserMessage>
      </ChatCompletion>
  );
}

function MakeSetting({ children }: { children: Node }) {
  return (
      <ChatCompletion temperature={1}>
        <UserMessage>Write a one-paragraph description of the setting: {children}.</UserMessage>
      </ChatCompletion>
  );
}

function WriteStory({ setting, characterBio }: { setting: Node, characterBio: Node}) {
  return (
    <Fancy>
    <ChatCompletion temperature={1}>
      <UserMessage>
        Write a short story set in the following setting:{" "}
        {setting}
        about the following character:{" "}
        {characterBio}
      </UserMessage>
    </ChatCompletion>
    </Fancy>
  );
}

function Summarize({ children }: { children: Node }) {
  return (
    <ChatCompletion temperature={1}>
      <UserMessage>
        Write a one-paragraph synopsis of the following story, as it might
        appear on a book jacket:{" "}
        {children}
      </UserMessage>
    </ChatCompletion>
  );
}

function MyStory() {
  const setting = <Show><MakeSetting>outer space</MakeSetting></Show>;
  const character = <Show><MakeCharacter>a talking space dog</MakeCharacter></Show>;
  const story = <Show><WriteStory setting={setting} characterBio={character} /></Show>;
  return (
    <Summarize>{story}</Summarize>
  );
}

console.log(await AI.createRenderContext().render(<MyStory />));
//showInspector(<MyStory />);


