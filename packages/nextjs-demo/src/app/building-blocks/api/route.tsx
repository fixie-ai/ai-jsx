/** @jsxImportSource ai-jsx/react */
import { NextRequest } from 'next/server';
import { UserMessage, ChatCompletion } from 'ai-jsx/core/completion';
import { MdxSystemMessage } from 'ai-jsx/react/jit-ui/mdx';
import { toTextStream } from 'ai-jsx/stream';
import { Message, StreamingTextResponse } from 'ai';
import _ from 'lodash';
import { OpenAI } from 'ai-jsx/lib/openai';

function BuildingBlocksAI({ query }: { query: string }) {
  const usageExamples = (
    <>
      Use a Card to display collected information to the user. The children can be markdown. Only use the card if you
      have a logically-grouped set of information to show the user, in the context of a larger response. Generally, your
      entire response should not be a card. A card takes optional header and footer props. Example 1 of how you might
      use this component: Here's the best candidate I found:
      {`<Card header="Sam Smith">
  **Skills**: React, TypeScript, Node.js **Location**: Seattle, WA **Years of experience**: 5 **Availability**:
  Full-time
</Card>`}
      Example 2 of how you might use this component:
      {`<Card header="Your Ferry Booking" footer="Reservation held for 20 minutes">
  **Leaves** at 4:15p and **arrives** at 6:20p.
</Card>`}
      Example 3 of how you might use this component (using with surrounding markdown): Sure, I'd be happy to help you
      find a car wash. Here are some options:
      {'<Card header="AutoWorld">$50 for a quick car wash.</Card>'}
      {'<Card header="Big Joel Big Trucks">$155 for a detailing</Card>'}
      {'<Card header="Small Joel Small Trucks">$10 for some guy to spray your car with a hose.</Card>'}
      Example 4 of how you might use this component, after writing out a report on economics: ... and that concludes the
      report on economics.
      {`<Card header="Primary Points">
  * Price is determined by supply and demand * Setting price floors or ceilings cause deadweight loss. *
  Interfering with the natural price can also cause shortages.
</Card>`}
      Use a button group when the user needs to make a choice. A ButtonGroup requires a labels prop. Example 1 of how
      you might use this component:
      {"<ButtonGroup labels={['Yes', 'No']} />"}
      Example 2 of how you might use this component (using with surrounding markdown): The system is configured. How
      would you like to proceed?
      {"<ButtonGroup labels={['Deploy to prod', 'Deploy to staging', 'Cancel']} />"}
      Use a badge to indicate status:
      {'<Badge color="yellow">In progress</Badge>'}
      {'<Badge color="green">Complete</Badge>'}
      Use a toggle to let users enable/disable an option:
      {'<Toggle title="Use rocket fuel" subtitle="($7 surcharge)" />'}
    </>
  );

  return (
    <OpenAI chatModel="gpt-4">
      <ChatCompletion>
        <MdxSystemMessage
          usageExamples={usageExamples}
          componentNames={['Card', 'ButtonGroup', 'ButtonGroup', 'Badge', 'Toggle']}
        />
        <UserMessage>{query}</UserMessage>
      </ChatCompletion>
    </OpenAI>
  );
}

export async function POST(request: NextRequest) {
  const { messages } = await request.json();
  const lastMessage = _.last(messages) as Message;

  return new StreamingTextResponse(toTextStream(<BuildingBlocksAI query={lastMessage.content} />));
}
