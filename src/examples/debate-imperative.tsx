import _ from 'lodash';
import { log } from '../lib';
import { openAIChat } from '../lib/models';

/**
 * Here's an example of the debate with no JSX. It's imperative, but I got it to work on the first try.
 * Even for being imperative, there very well may be a more elegant way to express it.
 */
async function debateDemoNoJSX(rounds: number, topic: string) {
  await log.enableWandB();
  async function makeChatCall(messagesAfterSystem: Parameters<typeof openAIChat>[0]['messages']) {
    const systemMessage = `You are an expert debater arguing about ${topic}. Each opening statement or reply must be two sentences or less.`;
    const response = await openAIChat(
      {
        model: 'gpt-3.5-turbo',
        max_tokens: 1000,
        messages: [{ role: 'system', content: systemMessage }, ...messagesAfterSystem],
      },
      { callName: 'debate-statement' }
    );
    return response.choices[0].message?.content ?? '';
  }
  function openingStatement(inFavor: boolean) {
    return makeChatCall([
      { role: 'user', content: `Give me an opening statement ${inFavor ? 'in favor of' : 'against'} ${topic}` },
    ]);
  }

  const openingStatements = await Promise.all([openingStatement(true), openingStatement(false)]);
  const messagesFromAlice = [openingStatements[0]];
  const messagesFromBob = [openingStatements[1]];

  for (let roundIndex = 0; roundIndex < rounds; roundIndex++) {
    const combinedMessages = _.zip(messagesFromAlice, messagesFromBob);
    const messagesWithAliceAsAssistant = combinedMessages.flatMap(
      ([aliceMessage, bobMessage]) =>
        [
          { role: 'assistant', content: aliceMessage! },
          { role: 'user', content: bobMessage! },
        ] as const
    );

    const nextAliceMessage = await makeChatCall(messagesWithAliceAsAssistant);
    messagesFromAlice.push(nextAliceMessage);
    const messagesWithBobAsAssistant = combinedMessages.flatMap(
      ([aliceMessage, bobMessage]) =>
        [
          { role: 'user', content: aliceMessage! },
          { role: 'assistant', content: bobMessage! },
        ] as const
    );

    const nextBobMessage = await makeChatCall(messagesWithBobAsAssistant);
    messagesFromBob.push(nextBobMessage);
  }

  for (const [aliceMessage, bobMessage] of _.zip(messagesFromAlice, messagesFromBob)) {
    console.log('Alice:', aliceMessage);
    console.log('Bob:', bobMessage);
    console.log();
  }
  log.disableWandB();
}

debateDemoNoJSX(2, 'prohibition in the 1920s');
