import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { Inline } from 'ai-jsx/core/inline';
import { showInspector } from 'ai-jsx/core/inspector';
import { JsonChatCompletion, YamlChatCompletion } from 'ai-jsx/batteries/constrained-output';
import z from 'zod';

function CharacterField(props: { fieldName: string }) {
  return (
    <>
      {props.fieldName}:{' '}
      <ChatCompletion>
        <SystemMessage>
          The user is generating a character sheet for a fantasy role-playing game. Your job is to provide a single
          value for one of the fields of the character sheet. Please only return the chosen value, and no other
          conversational text.
        </SystemMessage>
        <UserMessage>Please generate the character sheet field: {props.fieldName}</UserMessage>
      </ChatCompletion>
    </>
  );
}

function CharacterGenerator() {
  return (
    <>
      The following is a character profile for an RPG game in JSON format:{'\n'}
      <CharacterField fieldName="name" />
      {'\n'}
      <CharacterField fieldName="class" />
      {'\n'}
      <CharacterField fieldName="race" />
      {'\n'}
      <CharacterField fieldName="list of no more than three weapons" />
      {'\n'}
      <CharacterField fieldName="list of no more than two spells" />
    </>
  );
}

const characterSchema = z.object({
  name: z.string(),
  class: z.string(),
  race: z.string(),
  weapons: z.array(z.string()),
  spells: z.array(z.string()),
});

const app = (
  <Inline>
    <CharacterGenerator />
    {'\n\n'}
    The following is a JSON representation of this character profile:{'\n'}
    {(conversation) => (
      <JsonChatCompletion schema={characterSchema}>
        <UserMessage>{conversation}</UserMessage>
      </JsonChatCompletion>
    )}
    {'\n\n'}
    And here is a YAML representation of this character profile:{'\n'}
    {(conversation) => (
      <YamlChatCompletion schema={characterSchema}>
        <UserMessage>{conversation}</UserMessage>
      </YamlChatCompletion>
    )}
  </Inline>
);

showInspector(app, { showDebugTree: false });
