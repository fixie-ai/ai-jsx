/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx';
import { SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { showInspector } from 'ai-jsx/core/inspector';
import { memo } from 'ai-jsx/core/memoize';
import { MdxCompletion } from 'ai-jsx/react/jit-ui/mdx';
import { pino } from 'pino';
import { PinoLogger } from 'ai-jsx/core/log';
import { JsonChatCompletion } from 'ai-jsx/batteries/constrained-output';

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OpenAI } from 'ai-jsx/lib/openai';

const currentPath = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentPath, '..', '..', '..');

const buildingBlocksContent = await fs.readFile(
  path.join(packageRoot, 'packages/create-react-app-demo/src/story-teller/BuildingBlocksZach.tsx'),
  'utf-8'
);

function Card() {
  return null;
}
function ButtonGroup() {
  return null;
}
function BookFlight() {
  return null;
}
function BookHotel() {
  return null;
}

/* prettier-ignore */
const usageExample = <>
  Use a Card to display collected information to the user. The children can be markdown.
 
  Only use the card if you have a logically-grouped set of information to show the user, in the context of a larger response. Generally, your entire response should not be a card.

  A card takes optional header and footer props.
 
  Example 1:
   Here's the best candidate I found:
   <Card header='Sam Smith'>
     **Skills**: React, TypeScript, Node.js
     **Location**: Seattle, WA
     **Years of experience**: 5
     **Availability**: Full-time
   </Card>
 
  Example 2:
   <Card header='Your Ferry Booking' footer='Reservation held for 20 minutes'>
    **Leaves** at 4:15p and **arrives** at 6:20p.
   </Card>
 
  Example 3 (using with surrounding markdown):
   Sure, I'd be happy to help you find a car wash. Here are some options:
 
   <Card header='AutoWorld'>
    $50 for a quick car wash.
   </Card>
   <Card header='Big Joel Big Trucks'>
    $155 for a detailing
   </Card>
   <Card header='Small Joel Small Trucks'>
    $10 for some guy to spray your car with a hose.
   </Card>

  Use a button group when the user needs to make a choice. A ButtonGroup requires a labels prop.

  Example 1:
    <ButtonGroup labels={['Yes', 'No']} />

  Example 2 (using with surrounding markdown):
    The system is configured. How would you like to proceed?
    <ButtonGroup labels={['Deploy to prod', 'Deploy to staging', 'Cancel']} />

  Use a BookFlight component to let the user book a flight. BookFlight requires a flights prop.

  Example 1:
    <BookFlight flights={[
      {from: 'SEA', to: 'SFO', date: '2021-10-01', price: 100},
      {from: 'SEA', to: 'SFO', date: '2021-10-02', price: 200},
      {from: 'SEA', to: 'SFO', date: '2021-10-03', price: 300},
    ]} />

  Example 2 (using with surrounding markdown):
    Here are some flights:
    <BookFlight flights={[
      {from: 'ATL', to: 'NYC', date: '2023-07-01', price: 10},
      {from: 'ATL', to: 'NYC', date: '2023-07-02', price: 20},
      {from: 'ATL', to: 'NYC', date: '2023-07-03', price: 30},
    ]} />

  Use a BookHotel component to let the user book a hotel. BookHotel requires a hotels prop.

  Example 1:
    <BookHotel hotels={[
      {name: 'The Four Seasons', stars: 5},
      {name: 'Red Roof Inn', stars: 1},
      {name: 'Marriott', stars: 3},
    ]} />
</>

function QuestionAndAnswer({ children }: { children: AI.Node }) {
  const memoChildren = memo(children);
  return (
    <>
      Q: {memoChildren}{'\n'}
      A:{' '}
      <OpenAI chatModel="gpt-4">
        <MdxCompletion usageExamples={usageExample}>
          {memoChildren}
        </MdxCompletion>
      </OpenAI>
      {'\n\n'}
    </>
  );
}

function App() {
  return (
    <>
      <QuestionAndAnswer>
        My flight reservation: <UserMessage>
          <JsonChatCompletion>
            <UserMessage>Generate a sample flight reservation.</UserMessage>
          </JsonChatCompletion>{'\n'}
        </UserMessage>
        <UserMessage>Tell me about the flight reservation I just made.</UserMessage>
      </QuestionAndAnswer>
      {'\n\n'}
      <QuestionAndAnswer>
        Hotels: <UserMessage>
          <JsonChatCompletion>
            <UserMessage>Generate some information about hotels, including each hotel's name and how many stars it is</UserMessage>
          </JsonChatCompletion>{'\n'}
        </UserMessage>
        <UserMessage>I'd like to book a hotel</UserMessage>
      </QuestionAndAnswer>
      {'\n\n'}
      <QuestionAndAnswer>
        <UserMessage>Tell me a children's story. Summarize the key characters at the end.</UserMessage>
      </QuestionAndAnswer>
      {'\n\n'}
      <QuestionAndAnswer>
        <SystemMessage>You are an agent that can help the user buy cars. You have a few different workflows to do this. If the user asks what they are, make some up.</SystemMessage>
        <UserMessage>What can you help me with?</UserMessage>
      </QuestionAndAnswer>
      {'\n\n'}
    </>
  );
}

// showInspector(<App />);

const logger = pino({
  name: 'ai-jsx',
  level: process.env.loglevel ?? 'trace',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

let lastValue = '';
const rendering = AI.createRenderContext({ logger: new PinoLogger(logger) }).render(<App />, {appendOnly: true});
for await (const frame of rendering) {
  process.stdout.write(frame.slice(lastValue.length));
  lastValue = frame;
}

const finalResult = await rendering;
process.stdout.write(finalResult.slice(lastValue.length));