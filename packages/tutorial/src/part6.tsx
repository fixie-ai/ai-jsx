import * as AI from 'ai-jsx';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { Route, NaturalLanguageRouter } from 'ai-jsx/batteries/natural-language-router';
import { showInspector } from 'ai-jsx/core/inspector';
import enquirer from 'enquirer';

const { prompt } = enquirer;

async function getQuestion() {
  const response = await prompt({
    type: 'input',
    name: 'question',
    message: 'What question would you like to ask?',
  });
  // @ts-ignore
  const { question } = response;
  return question;
}

function ThinkOfAnAnimal() {
  return (
    <ChatCompletion temperature={1.5}>
      <SystemMessage>
        Your job is to name an uncommon animal. Just provide the name of the animal, and no other information.
      </SystemMessage>
      <UserMessage>Please name an uncommon animal.</UserMessage>
    </ChatCompletion>
  );
}

function AnimalGame({ question, animal }: { question: string, animal: string }) {
  const correctRoute = `The user's question about ${animal} is correct.`;
  const incorrectRoute = `The user's question about ${animal} is incorrect.`;

  return (
    <NaturalLanguageRouter query={question}>
      <Route when={correctRoute}>{'That is correct!'}</Route>
      <Route when={incorrectRoute}>{'That is incorrect!'}</Route>
    </NaturalLanguageRouter>
  );
}

const renderContext = AI.createRenderContext();
const animal = await renderContext.render(<ThinkOfAnAnimal />);
console.log('The animal is ' + animal);

const question = await getQuestion();

const app = <AnimalGame question={question} animal={animal} />;

showInspector(app);
