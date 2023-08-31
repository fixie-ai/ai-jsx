---
sidebar_position: 3
---

# Tutorial Part 3 - Constraining the output

When generating text from an LLM, it is often useful to constrain the output to a particular
format, such as JSON or YAML. AI.JSX provides a number of components that can be used to
achieve this.

In the following example, we're going to have the LLM generate a character sheet for a
fantasty role-playing game, and then ensure that the output is formatted as either
JSON or YAML.

## Generating a plain-text character sheet

Let's start with a component called `<CharacterGenerator>` that will generate a list of
fields

```tsx filename="packages/tutorial/src/constrained-output.tsx"
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
```

The component will generate text like:

```
The following is a character profile for an RPG game in JSON format:
name: Aria
class: Ranger
race: Elf.
list of no more than three weapons: Long sword, Short bow, Dagger.
list of no more than two spells: Firebolt, Mage Armor.
```

where each field is generated in parallel by a component called `<CharacterField>`.

## Generating one field of the character sheet

```tsx filename="packages/tutorial/src/constrained-output.tsx"
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
```

`<CharacterField>` is simply a use of `<ChatCompletion>` to invoke the LLM. The
`<SystemMessage>` component contains the system prompt to instruct the LLM in general
how to respond, and the `<UserMessage>` component contains the specific prompt for this
field in the character sheet.

## Formatting the output as JSON and YAML

Now, we're going to use two new components -- [`<JsonChatCompletion>`](../api/modules/batteries_constrained_output#jsonchatcompletion) and [`<YamlChatCompletion>`](../api/modules/batteries_constrained_output#yamlchatcompletion) --
to take the plain-text output of `<CharacterGenerator>` and format it as JSON and YAML.

```tsx filename="packages/tutorial/src/constrained-output.tsx"
const app = (
  <Inline>
    <CharacterGenerator />
    {'\n\n'}
    The following is a JSON representation of this character profile:{'\n'}
    {(conversation) => (
      <JsonChatCompletion>
        <UserMessage>{conversation}</UserMessage>
      </JsonChatCompletion>
    )}
    {'\n\n'}
    And here is a YAML representation of this character profile:{'\n'}
    {(conversation) => (
      <YamlChatCompletion>
        <UserMessage>{conversation}</UserMessage>
      </YamlChatCompletion>
    )}
  </Inline>
);
```

For example, the `<JsonChatCompletion>` component will emit:

```
{
    "name": "Aria",
    "class": "Ranger",
    "race": "Elf",
    "weapons": [
        "Long sword",
        "Short bow",
        "Dagger"
    ],
    "spells": [
        "Firebolt",
        "Mage Armor"
    ]
}
```

Internally, the `<JsonChatCompletion>` and `<YamlChatCompletion>` components prompt the
LLM to take the input data, format it as JSON or YAML, and check that the resulting objects
correctly parse in the target format.

You can even enforce an _object Schema_ to make sure the output matches the format you want:

```tsx filename="packages/tutorial/src/constrained-output.tsx"
import z from 'zod';

const characterSchema = z.object({
  name: z.string(),
  class: z.string(),
  race: z.string(),
  weapons: z.array(z.string()),
  spells: z.array(z.string()),
});

const app = (
  // ...
  <JsonChatCompletion schema={characterSchema}>
    <UserMessage>{conversation}</UserMessage>
  </JsonChatCompletion>
  // ...
);
```
