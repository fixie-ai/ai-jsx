---
sidebar_position: 2
---

# Getting Started

See [getting-started](https://github.com/fixie-ai/ai-jsx/blob/main/packages/examples/src/getting-started/index.tsx) for the finished version of this workshop.

## Hello World

1. Clone the [template repo](https://github.com/fixie-ai/ai-jsx-template).
1. Run it, and you'll get output like:
   ```
   Is there anything more fascinating than the mysteries and wonders of Ancient Egypt?
   ```

In the rest of this workshop, we'll expand on this demo to make it more interesting.

## Using the Inspector

The [Inspector](https://github.com/fixie-ai/ai-jsx/blob/main/packages/ai-jsx/src/inspector/console.tsx) is a bare-bones [Ink](https://github.com/vadimdemedes/ink) app.

The inspector shows the program output on the left hand side, and the debug tree on the right. The debug tree gives you some (imperfect) visibility into how your program was constructed. Use the left and right arrow keys to step through the debug tree.

To use it:

```tsx title="index.tsx"
import { showInspector } from 'ai-jsx/core/inspector';

/* Swap this out */
// console.log(
//   await LLMx.createRenderContext({
//     logger: new PinoLogger(pinoStdoutLogger),
//   }).render(<App />)
// );

/* Use the inspector instead */
showInspector(<App />);
```

## Observability

Every time AI.JSX runs, it writes the log results to `llmx.log`.

Use `grep` to find relevant logs from this file, and `pino-pretty` to format them nicely.

For instance, to see the model call made in our example above:

```{}
grep -i 'starting modelcall' packages/ai-jsx/llmx.log | yarn workspace ai-jsx pino-pretty
[15:09:13.463] DEBUG (@fixieai-ai-jsx/68581): Starting modelCall
    lifetimeId: "8f7291ee-1564-481d-9ac9-e4fa5ca2ffca"
    callId: "4b63469b-32da-4a6e-a364-f4ee4c5887c3"
    params: {
      "model": "gpt-3.5-turbo",
      "messages": [
        {
          "role": "system",
          <!-- highlight-next-line -->
          "content": "You are an assistant who only uses one syllable words."
        },
        {
          "role": "user",
          "content": "Why is the sky blue?"
        }
      ],
      "stream": true
    }
    callName: "openai-chat"
    phase: "modelCall"
    start: true
```

## Enrichment

LLM apps are more powerful when we enrich the prompt with real-time data. Let's augment our example to include that.

1. Create a new file in the your project directory called `data.json`:
   ```json title="data.json"
   { "name": "sam", "age": 42, "hobbies": ["painting"] }
   ```
1. Write a function to read this file:

   ```tsx title="index.tsx"
   import path from 'node:path';
   import fs from 'node:fs/promises';

   function loadData() {
     const filePath = path.join(process.cwd(), 'data.json');
     return fs.readFile(filePath);
   }
   ```

1. Then, call this function from your completion component:
   ```tsx title="index.tsx"
   async function App() {
     const data = await loadData();
     return (
       <ChatCompletion>
         <UserMessage>Tell me about this JSON: {data}</UserMessage>
       </ChatCompletion>
     );
   }
   ```

When we run this, we'll get:

> This JSON represents an object that has three properties: "name", "age", and "hobbies".
>
> The "name" property has a value of "sam", indicating that this object is associated with someone named Sam.
>
> The "age" property has a value of 42, indicating that Sam is 42 years old.
>
> The "hobbies" property is an array with a single item, "painting", indicating that Sam's hobby is painting.
>
> Overall, this JSON provides information about an individual's identity and interests.

## Orchestration

More powerful applications benefit from being able to link LLM calls together. Let's modify our example to do multiple LLM generations.

1. Add a new function to generate a short bio of a fantasy character:
   ```tsx title="index.tsx"
   function MakeCharacter() {
     return (
       <ChatCompletion temperature={1}>
         <UserMessage>Write a short bio of a character in a fantasy novel.</UserMessage>
       </ChatCompletion>
     );
   }
   ```
1. Add a new function that uses the previous function:

   ```tsx title="index.tsx"
   function WriteStory() {
     return (
       <ChatCompletion temperature={1}>
         <UserMessage>
           Write a story about these three characters:
           <MakeCharacter />
           <MakeCharacter />
           <MakeCharacter />
         </UserMessage>
       </ChatCompletion>
     );
   }
   ```

1. Show it on the console:
   ```tsx title="index.tsx"
   showInspector(<WriteStory />);
   ```

Running it, we'll a something like this:

> Eldra, Jalara, and Aria found themselves at a crossroads in their lives, each searching for something more. They had all independently heard rumors of a mystical land known as the Cavern of Secrets, a place said to hold untold treasures and knowledge beyond their wildest dreams.
>
> Eager to prove themselves, the trio decided to set aside their differences and embark on the journey together. Eldra was searching for a new challenge, Jalara hoped to uncover lost magical artifacts, and Aria sought to expand her knowledge and prophetic abilities.
>
> Together, they journeyed through treacherous terrain and battled against fierce creatures, their skills complementing each other perfectly. Eldra's pugilist abilities kept their enemies at bay, Jalara's sorcery helped them navigate unfamiliar terrain, and Aria's warding spells protected them from harm.
>
> (Clipped for brevity)

To see the previous characters that were generated, we can look in the logs:

```
$ grep -i 'starting modelcall' packages/ai-jsx/llmx.log | yarn workspace ai-jsx pino-pretty

# Actual results snipped for brevity.

# Three of these calls appear
"messages": [
  {
    "role": "user",
    "content": "Write a short bio of a character in a fantasy novel."
  }
],

# In this call, we see the results of the previous calls being fed into the model
"messages": [
  {
    "role": "user",
    "content": "Write a story about these three characters:Eldra, the elf pugilist,
    was born into a noble family within the magical forest of Yarthenia.
    However, unlike her kin, she preferred the thrill of exploring the dangers that lay outside the forest, rather than the safe confines of her home.
    This impetuous spirit led Eldra down a path of danger and violence, which ultimately honed her skills as a warrior of unmatched prowess.
    As one of the few elvish pugilists in recent history, her skills with hand-to-hand combat were the envy of all who met her.
    Now, Eldra spends her days traveling the realm in search of new challenges, her fists always at the ready for the next fight.
    Despite her rough exterior, Eldra is fiercely loyal to those she considers friends and will stop at nothing to protect them.
    Jalara, a powerful sorceress, was born in the Kingdom of Arcadia.
    She was the youngest of three siblings, and from a young age, she displayed an innate ability to harness the powers of magic.
    Her older brother was sent to train as a knight, and her sister was married off to a foreign prince.
    Jalara, however, had other plans.
    She devoted herself entirely to the study of magic, learning from the wisest sorcerers in the land.
    \n\nAs she grew older, Jalara gained a reputation for being wise, powerful, and fair.
    She was often called upon to mediate disputes between kingdoms, and her counsel was highly valued.
    Jalara was always willing to lend her magic to aid those in need, but she was also fiercely independent, and many feared her wrath.
    \n\nHer greatest triumph came when she defeated the dark wizard, Zoltar, in a fierce magical battle.
    The victory cemented her place as one of the most powerful sorceresses in the land.
    Though Jalara no longer seeks out adventure in the way she once did, her wisdom and magic continue to shape the fate of the Kingdom of Arcadia.
    Born in the Kingdom of Eldor, Aria is a powerful sorceress who possesses an exceptional talent for magic.
    She discovered her gift at a young age and spent years honing her skills, studying under some of the most renowned wizards in the land.
    With her mystical powers, she has become a valuable asset to King Eramis, who often seeks her prophetic advice on matters concerning the realm.
    Despite her great power and wisdom, Aria remains humble and compassionate, always looking out for the welfare of her people.
    Her most notable achievement to date was orchestrating the warding spell that saved Eldor from the infamous Night Dragon, which had long terrorized the kingdom.
    Aria is revered by many and feared by her enemies, who know all too well the consequences of crossing her."
  }
],
```
