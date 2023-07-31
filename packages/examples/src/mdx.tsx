/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx';
import { SystemMessage, UserMessage, ChatCompletion } from 'ai-jsx/core/completion';
import { showInspector } from 'ai-jsx/core/inspector';
import { MdxSystemMessage } from 'ai-jsx/react/jit-ui/mdx';
import { JsonChatCompletion } from 'ai-jsx/batteries/constrained-output';
import z from 'zod';

import { OpenAI } from 'ai-jsx/lib/openai';

/* eslint-disable @typescript-eslint/no-unused-vars */
function Card({ header, footer, children }: { header?: string; footer?: string; children: string }) {
  return null;
}
function ButtonGroup({ labels }: { labels: string[] }) {
  return null;
}
function BookFlight({ flights }: { flights: any }) {
  return null;
}
function BookHotel({ hotels }: { hotels: any }) {
  return null;
}
/* eslint-enable @typescript-eslint/no-unused-vars */

/* prettier-ignore */
const usageExample = <>
  Use a Card to display collected information to the user. The children can be markdown.
 
  Only use the card if you have a logically-grouped set of information to show the user, in the context of a larger response. Generally, your entire response should not be a card.

  A card takes optional header and footer props.
 
  Example 1 of how you might use this component:
   Here's the best candidate I found:
   <Card header='Sam Smith'>
     **Skills**: React, TypeScript, Node.js
     **Location**: Seattle, WA
     **Years of experience**: 5
     **Availability**: Full-time
   </Card>
 
  Example 2 of how you might use this component:
   <Card header='Your Ferry Booking' footer='Reservation held for 20 minutes'>
    **Leaves** at 4:15p and **arrives** at 6:20p.
   </Card>
 
  Example 3 of how you might use this component (using with surrounding markdown):
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

  Example 4 of how you might use this component, after writing out a report on economics:
   ... and that concludes the report on economics.
   <Card header='Primary Points'>
     * Price is determined by supply and demand
     * Setting price floors or ceilings cause deadweight loss.
     * Interfering with the natural price can also cause shortages.
   </Card>

  Use a button group when the user needs to make a choice. A ButtonGroup requires a labels prop.

  Example 1 of how you might use this component:
    <ButtonGroup labels={['Yes', 'No']} />

  Example 2 of how you might use this component (using with surrounding markdown):
    The system is configured. How would you like to proceed?
    <ButtonGroup labels={['Deploy to prod', 'Deploy to staging', 'Cancel']} />

  Use a BookFlight component to let the user book a flight. BookFlight requires a flights prop.

  {/* We may be able to remove all the whitespace from the object literals in these
      prop examples and thus convince the model to skip the whitespace as well,
      improving performance.
   */}
  Example 1 of how you might use this component:
    <BookFlight flights={[
      {from: 'SEA', to: 'SFO', date: '2021-10-01', price: 100},
      {from: 'SEA', to: 'SFO', date: '2021-10-02', price: 200},
      {from: 'SEA', to: 'SFO', date: '2021-10-03', price: 300},
    ]} />

  Example 2 of how you might use this component (using with surrounding markdown):
    Here are some flights:
    <BookFlight flights={[
      {from: 'ATL', to: 'NYC', date: '2023-07-01', price: 10},
      {from: 'ATL', to: 'NYC', date: '2023-07-02', price: 20},
      {from: 'ATL', to: 'NYC', date: '2023-07-03', price: 30},
    ]} />

  Use a BookHotel component to let the user book a hotel. BookHotel requires a hotels prop.

  Example 1 of how you might use this component:
    <BookHotel hotels={[
      {name: 'The Four Seasons', stars: 5},
      {name: 'Red Roof Inn', stars: 1},
      {name: 'Marriott', stars: 3},
    ]} />
</>;

function QuestionAndAnswer({ children }: { children: AI.Node }, { memo }: AI.ComponentContext) {
  const question = memo(children);
  return (
    <>
      <OpenAI chatModel="gpt-4">
        Q: {question}
        {'\n'}
        A: <ChatCompletion>
          <MdxSystemMessage usageExamples={usageExample} />
          <UserMessage>{question}</UserMessage>
        </ChatCompletion>
        {'\n\n'}
      </OpenAI>
    </>
  );
}

export function App() {
  return (
    <>
      <QuestionAndAnswer>
        <SystemMessage>
          You are an AI that helps users book flights. The user's reservation:{' '}
          <JsonChatCompletion schema={z.object({ reservation: z.any() })}>
            <UserMessage>Generate a sample flight reservation.</UserMessage>
          </JsonChatCompletion>
        </SystemMessage>
        <UserMessage>Tell me about the flight reservation I just made.</UserMessage>
      </QuestionAndAnswer>
      {'\n\n'}
      <QuestionAndAnswer>
        <SystemMessage>
          You are an AI that helps users book hotels. Hotels:{' '}
          <JsonChatCompletion schema={z.object({ hotels: z.any() })}>
            <UserMessage>
              Generate some information about hotels, including each hotel's name and how many stars it is
            </UserMessage>
          </JsonChatCompletion>
        </SystemMessage>
        <UserMessage>I'd like to book a hotel</UserMessage>
      </QuestionAndAnswer>
      {'\n\n'}
      <QuestionAndAnswer>
        <SystemMessage>You are an AI who tells stories.</SystemMessage>
        <UserMessage>Tell me a children's story. Summarize the key characters at the end.</UserMessage>
      </QuestionAndAnswer>
      {'\n\n'}
      <QuestionAndAnswer>
        <SystemMessage>
          You are an agent that can help the user buy cars. You have a few different workflows to do this. If the user
          asks what they are, make some up.
        </SystemMessage>
        <UserMessage>What can you help me with?</UserMessage>
      </QuestionAndAnswer>
      {'\n\n'}
    </>
  );
}

// showInspector(<App />);

let lastValue = '';
const rendering = AI.createRenderContext().render(<App />, { appendOnly: true });
for await (const frame of rendering) {
  process.stdout.write(frame.slice(lastValue.length));
  lastValue = frame;
}

