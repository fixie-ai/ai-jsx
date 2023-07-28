/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/experimental/next';
import { NextRequest } from 'next/server';
import { UserMessage } from 'ai-jsx/core/completion';
import BuildingBlocksMap from '@/components/BuildingBlocks.map';
const { Card, ButtonGroup } = BuildingBlocksMap;
import fs from 'fs';
import path from 'path';
import { MdxChatCompletion } from 'ai-jsx/react/jit-ui/mdx';

// Flip this flag to use a fixture response. This makes it easier to iterate on the UI.
const useFixture = false;

function BuildingBlocksAI({ query }: { query: string }) {
  const usageExamples = (
    <>
      Use a Card to display collected information to the user. The children can be markdown. Only use the card if you
      have a logically-grouped set of information to show the user, in the context of a larger response. Generally, your
      entire response should not be a card. A card takes optional header and footer props. Example 1 of how you might
      use this component: Here's the best candidate I found:
      <Card header="Sam Smith">
        **Skills**: React, TypeScript, Node.js **Location**: Seattle, WA **Years of experience**: 5 **Availability**:
        Full-time
      </Card>
      Example 2 of how you might use this component:
      <Card header="Your Ferry Booking" footer="Reservation held for 20 minutes">
        **Leaves** at 4:15p and **arrives** at 6:20p.
      </Card>
      Example 3 of how you might use this component (using with surrounding markdown): Sure, I'd be happy to help you
      find a car wash. Here are some options:
      <Card header="AutoWorld">$50 for a quick car wash.</Card>
      <Card header="Big Joel Big Trucks">$155 for a detailing</Card>
      <Card header="Small Joel Small Trucks">$10 for some guy to spray your car with a hose.</Card>
      Example 4 of how you might use this component, after writing out a report on economics: ... and that concludes the
      report on economics.
      <Card header="Primary Points">
        * Price is determined by supply and demand * Setting price floors or ceilings cause deadweight loss. *
        Interfering with the natural price can also cause shortages.
      </Card>
      Use a button group when the user needs to make a choice. A ButtonGroup requires a labels prop. Example 1 of how
      you might use this component:
      <ButtonGroup labels={['Yes', 'No']} />
      Example 2 of how you might use this component (using with surrounding markdown): The system is configured. How
      would you like to proceed?
      <ButtonGroup labels={['Deploy to prod', 'Deploy to staging', 'Cancel']} />
    </>
  );

  return (
    <MdxChatCompletion hydrate usageExamples={usageExamples}>
      <UserMessage>{query}</UserMessage>
    </MdxChatCompletion>
  );
}

export async function POST(request: NextRequest) {
  const { topic } = await request.json();

  // This is an intentional constant flag.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (useFixture) {
    const textEncoder = new TextEncoder();
    const fakeStream = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'recipe', 'api', 'fixture.txt'), 'utf-8');
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(textEncoder.encode(fakeStream));
          controller.close();
        },
      })
    );
  }

  return AI.toReactStream(BuildingBlocksMap, <BuildingBlocksAI query={topic} />);
}
