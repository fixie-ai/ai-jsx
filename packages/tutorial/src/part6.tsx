import * as AI from 'ai-jsx';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { Route, NaturalLanguageRouter } from 'ai-jsx/batteries/natural-language-router';
import { showInspector } from 'ai-jsx/core/inspector';
import enquirer from 'enquirer';

const { prompt } = enquirer;

/** Prompt the user for their question. */
async function getQuestion(questionNumber: number, maxQuestions: number) {
  const response = await prompt({
    type: 'input',
    name: 'question',
    message: `[Question ${questionNumber + 1}/${maxQuestions}] Your question`,
  });
  // @ts-expect-error
  const { question } = response;
  return question;
}

/** This component thinks of an uncommon animal name. */
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

/** This component attempts to filter out bad questions from the user. */
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

/** This component answers the user's question. */
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

function AnimalGame({ question, animal }: { question: string; animal: string }) {
  return (
    <QuestionFilter question={question}>
      <AnswerQuestion question={question} animal={animal} />
    </QuestionFilter>
  );
}

// The below is the main game logic.

// First, come up with the animal we're going to get the user to guess.
const renderContext = AI.createRenderContext();
let animal = await renderContext.render(<ThinkOfAnAnimal />);
if (animal.endsWith('.')) {
  animal = animal.slice(0, -1);
}
// Of course, this is for debugging only!
console.log(`I am thinking of: ${animal}\n`);

// Now, let the user ask up to 20 questions about the animal.
let numQuestions = 0;
const MAX_QUESTIONS = 20;
while (numQuestions < MAX_QUESTIONS) {
  const question = await getQuestion(numQuestions, MAX_QUESTIONS);
  const answer = await renderContext.render(<AnimalGame question={question} animal={animal} />);
  console.log(`${answer}\n`);
  numQuestions++;
  if (answer.includes('You got it right!')) {
    console.log('You win!');
    break;
  }
}

if (numQuestions === MAX_QUESTIONS) {
  console.log(`I'm sorry, the animal I was thinking of was a ${animal}.`);
}
