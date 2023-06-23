---
sidebar_position: 6
---

# Tutorial Part 6 - Using the Natural Language Router

One of the most powerful features of AI.JSX is the ability to use Large Language Models
not just for interpreting and generating natural language, but also for control flow.
In this section, we'll show how to use the Natural Language Router to build a simple
guessing game, in which the AI.JSX components that are rendered depend on the user input.

## `<NaturalLanguageRouter>`

The [`<NaturalLanguageRouter>`](/api/modules/batteries_natural_language_router#naturallanguagerouter)
component allows you to route to different components based on the LLM's interpretation of
a given query string. Here's a simple example:

```tsx filename="packages/tutorial/src/part6.tsx"
function QuestionFilter(props: { children: AI.Node; question: string }) {
  return (
    <NaturalLanguageRouter query={props.question}>
      <Route when='The query is a simple question about an animal that can be answered with "yes" or "no."'>
        {props.children}
      </Route>
      <Route when="The query is not a simple yes-or-no question about an animal.">
        I'm sorry, but I can only accept yes/no questions about animals.
      </Route>
    </NaturalLanguageRouter>
  );
}

function QuestionAnswerer() {
  return <QuestionFilter question="Is a red panda a mammal?">This is a valid question.</QuestionFilter>;
}
```

In this example, the `<QuestionFilter>` component uses the `<NaturalLanguageRouter>` to
determine whether the `question` provided is a simple yes/no question about an animal.
If not, it renders to "I'm sorry, but I can only accept yes/no questions about animals."
Otherwise, the component renders its children.

The `<NaturalLanguageRouter>` component can have any number of `<Route>` children. Each
`<Route>` child has a `when` prop, which is a query string that is interpreted by the LLM
against the `query` prop of the `<NaturalLanguageRouter>` component.

## The Animal Guessing Game

Let's use this ability to render different components based on the user's input to build
a simple guessing game, in which the AI thinks of an unusual animal, and the user can ask
up to 20 yes/no questions to determine what it is. You can run this example with:

```
$ yarn workspace tutorial run tutorial-part6
```

from the top of the `ai-jsx` tree.

## Thinking of an animal

First, let's use the LLM to come up with the name of an unusual animal:

```tsx filename="packages/tutorial/src/part6.tsx"
function ThinkOfAnAnimal() {
  return (
    <ChatCompletion temperature={1.5}>
      <SystemMessage>
        Your job is to name an uncommon animal. Just provide the name of the animal, and no other information. The name
        of the animal should be in lowercase, singular, with no quotation marks.
      </SystemMessage>
      <UserMessage>Please name an uncommon animal.</UserMessage>
    </ChatCompletion>
  );
}

const renderContext = AI.createRenderContext();
let animal = await renderContext.render(<ThinkOfAnAnimal />);
```

This is just using the `<ChatCompletion>` component as we have seen previously.

## Prompting the user for questions

Since this is a command line app, we're using the [Enquirer](https://www.npmjs.com/package/enquirer)
package to prompt the user for their individual questions:

```tsx filename="packages/tutorial/src/part6.tsx"
import enquirer from 'enquirer';
const { prompt } = enquirer;

async function getQuestion(questionNumber: number, maxQuestions: number) {
  const response = await prompt({
    type: 'input',
    name: 'question',
    message: `[Question ${questionNumber + 1}/${maxQuestions}] Your question`,
  });
  const { question } = response;
  return question;
}
```

## Filtering out bad questions

We want to prevent the user from asking questions that are not yes/no questions about
an animal. Otherwise the user could ask things like "what is the animal you're thinking of?" or
"what is the capital of France?". To do this, we'll use the
`<QuestionFilter>` component we defined earlier:

```tsx filename="packages/tutorial/src/part6.tsx"
function AnimalGame({ question, animal }: { question: string; animal: string }) {
  return (
    <QuestionFilter question={question}>
      <AnswerQuestion question={question} animal={animal} />
    </QuestionFilter>
  );
}

const question = await getQuestion(numQuestions, MAX_QUESTIONS);
const answer = await renderContext.render(<AnimalGame question={question} animal={animal} />);
```

The `<AnswerQuestion>` component, defined below, is only invoked if the user's query matches
the first route of the `<NaturalLanguageRouter>` component.

## Answering the user's questions

Next, we want to answer the user's questions. We'll use `<NaturalLanguageRouter>` again,
this time asking it to determine if the user's question should have the answer "yes" or "no"
with respect to the animal in question, or whether the user has correctly guessed the animal.

```tsx filename="packages/tutorial/src/part6.tsx"
function AnswerQuestion({ question, animal }: { question: string; animal: string }) {
  const exactRoute = `The user asks if the animal is ${animal}.`;
  const correctRoute = `The user's query is true for ${animal}`;
  const incorrectRoute = `The user's query is false for ${animal}`;

  return (
    <NaturalLanguageRouter query={question}>
      <Route when={exactRoute}>
        <ChatCompletion>
          <SystemMessage>
            Rewrite this statement to be grammatically correct, without quotation marks, using the form: "🎉 You got it
            right! The animal I was thinking of was..."
          </SystemMessage>
          <UserMessage>🎉 You got it right! The animal I was thinking of was {animal}.</UserMessage>
        </ChatCompletion>
      </Route>
      <Route when={correctRoute}>
        <ChatCompletion>
          <SystemMessage>
            Answer the following question about the animal "{animal}" in the affirmative, using the form: "👍 Yes, the
            animal I am thinking of ...". Do not, under any circumstances, reveal any other information, especially not
            the animal itself.
          </SystemMessage>
          <UserMessage>{question}</UserMessage>
        </ChatCompletion>
      </Route>
      <Route when={incorrectRoute}>
        <ChatCompletion>
          <SystemMessage>
            Answer the following question about the animal "{animal}" in the negative, using the form: "❌ No, the
            animal I am thinking of ...". Do not, under any circumstances, reveal any other information, especially not
            the animal itself.
          </SystemMessage>
          <UserMessage>{question}</UserMessage>
        </ChatCompletion>
      </Route>
    </NaturalLanguageRouter>
  );
}
```

Here, the first route is rendered if the user correctly guesses the animal, the second
route if the answer to the question is "yes", and the third route if the answer to the
question is "no".

For the responses, we use another `<ChatCompletion>` component to get the model to
generate a grammatically correct response to the user's question -- this is a really
powerful use of LLMs to ensure the responses make sense. We also admonish the model
not to reveal the name of the animal it's thinking of!

## Example

Here's an example run of the game. Note that it prints out the animal it's thinking of
at the top, so the game isn't that hard, but it's useful for testing things out.

```
$  yarn workspace ai-jsx run build && yarn workspace tutorial run part6
I am thinking of: quokka

✔ [Question 1/20] Your question · Is it an insect?
❌ No, the animal I am thinking of is not an insect.

✔ [Question 2/20] Your question · Is it a mammal?
👍 Yes, the animal I am thinking of is a mammal.

✔ [Question 3/20] Your question · Is it nocturnal?
❌ No, the animal I am thinking of is not nocturnal.

✔ [Question 4/20] Your question · What is the capital of France?
I'm sorry, but I can only accept yes/no questions about animals.

✔ [Question 5/20] Your question · What animal are you thinking of?
I'm sorry, but I can only accept yes/no questions about animals.

✔ [Question 6/20] Your question · Does it live in Australia?
👍 Yes, the animal I am thinking of lives in Australia.

✔ [Question 7/20] Your question · Is it a kangaroo?
❌ No, the animal I am thinking of is not a kangaroo.

✔ [Question 8/20] Your question · Is it a quokka?
🎉 Congratulations, you got it right! The animal I was thinking of was a quokka.
```
