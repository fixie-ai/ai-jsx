/* @ts-nocheck eslint-disable */
// This file is busted.

import _ from 'lodash';
import { LLMx, Models, log, CompletionComponents } from '../lib';
import { openAIChat } from '../lib/models';
import { LLM } from 'langchain/dist/llms/base';
import { Debug } from '../lib/llm';

const { Completion } = CompletionComponents;

function PlaceholderCompletion({ tag }, children: LLMx.Node[]) {
  let current: LLMx.Node[] = [];

  children.forEach((child) => {
    const props = LLMx.GetProps(tag, child);
    if (props === null) {
      current.push(child);
    } else {
      current = [current, LLMx.createElement(tag, props, current)];
    }
  });

  return current;
}

function Debater({ position, name, inFavor }, children) {
  return (
    <Completion temperature={0.5} stop={['\n']} maxTokens={1000}>
      You are a skilled and concise debater named {name} arguing {inFavor ? 'in favor of' : 'against'} the following
      position: {position}
      Each opening statement or reply must be two sentences or less.
      {children}
    </Completion>
  );
}

function DebateDemo({ position, rounds }, children) {
  const aliceProps = { name: 'Alice', inFavor: true, position };
  const bobProps = { name: 'Bob', inFavor: false, position };

  // Opening statements are made in parallel.
  let current = (
    <>
      <PlaceholderCompletion tag={Debater}>
        Alice's Opening Statement: <Debater {...aliceProps} />
      </PlaceholderCompletion>
      {'\n\n'}
      <PlaceholderCompletion tag={Debater}>
        Bob's Opening Statement: <Debater {...bobProps} />
      </PlaceholderCompletion>
    </>
  );

  for (let i = 0; i < rounds; ++i) {
    current = (
      <PlaceholderCompletion tag={Debater}>
        {current}
        {'\n\n'}
        Alice: <Debater {...aliceProps} />
        {'\n\n'}
        Bob: <Debater {...bobProps} />
      </PlaceholderCompletion>
    );
  }
  return current;
}

function OpeningStatement({ position, inFavor }) {
  return (
    <CompletionComponents.ChatCompletion maxTokens={1000}>
      <CompletionComponents.SystemMessage>
        You are an expert debater arguing {inFavor ? 'in favor of' : 'against'} the following position: {position}
        Each opening statement or reply must be two sentences or less.
      </CompletionComponents.SystemMessage>
      <CompletionComponents.UserMessage>Make your opening statement.</CompletionComponents.UserMessage>
    </CompletionComponents.ChatCompletion>
  );
}

function DebateDemoChat() {
  const topic = 'prohibition in the 1920s';
  return (
    <>
      Alice: <OpeningStatement position={topic} inFavor />
      <br />
      <br />
      Bob: <OpeningStatement position={topic} inFavor={false} />
    </>
  );
}

// I feel like trying to do a whole debate this way could get gnarly. Maybe this is a place where we want to eject from JSX.
// I wonder if we can still yield partial results when each round is complete.

// I suspect that just creating a big string will be increasingly disinteresting for large use-cases – what people
// really will want is to label sections and extract them from the responses, so they can be formatted appropriately.

// I wonder if making streaming the pit of success will be the big value prop.

async function DebateDemoChatWithFirstResponse({ rounds }: { rounds: number }) {
  const topic = 'prohibition in the 1920s';
  const aliceOpener = <OpeningStatement position={topic} inFavor />;
  const bobOpener = <OpeningStatement position={topic} inFavor={false} />;

  const messagesFromAlice = [aliceOpener];
  const messagesFromBob = [bobOpener];

  // // This won't work because every ChatCompetion fires independently, even if it doesn't have the prior context yet.
  // // I should try to see the Debug tree

  // for (let roundIndex = 0; roundIndex < rounds + 1; roundIndex++) {
  //   const aliceRound = [
  //     <CompletionComponents.SystemMessage>You are an expert debater about {topic}.</CompletionComponents.SystemMessage>,
  //     ..._.range(roundIndex).flatMap((i) => [
  //       <CompletionComponents.UserMessage>{messagesFromBob[i]}</CompletionComponents.UserMessage>,
  //       <CompletionComponents.AssistantMessage>{messagesFromAlice[i]}</CompletionComponents.AssistantMessage>,
  //     ]),
  //   ];

  //   const bobRound = [
  //     <CompletionComponents.SystemMessage>You are an expert debater about {topic}.</CompletionComponents.SystemMessage>,
  //     ..._.range(roundIndex).flatMap((i) => [
  //       <CompletionComponents.UserMessage>{messagesFromAlice[i]}</CompletionComponents.UserMessage>,
  //       <CompletionComponents.AssistantMessage>{messagesFromBob[i]}</CompletionComponents.AssistantMessage>,
  //     ]),
  //   ];

  //   messagesFromAlice.push(
  //     <CompletionComponents.ChatCompletion maxTokens={10}>{aliceRound}</CompletionComponents.ChatCompletion>
  //   );

  //   messagesFromBob.push(
  //     <CompletionComponents.ChatCompletion maxTokens={10}>{bobRound}</CompletionComponents.ChatCompletion>
  //   );
  // }

  // console.log(messagesFromAlice);
  // Log.log.warn({ messagesFromAlice, messagesFromBob }, 'messages from both');

  // return _.range(rounds).flatMap((roundIndex) => ([
  //     'Alice: ',
  //     messagesFromAlice[roundIndex],
  //     <br />,
  //     <br />,
  //     'Bob: ',
  //     messagesFromBob[roundIndex],
  //     <br />,
  //     <br />,
  // ]));

  // return (<>
  //   Alice: {messagesFromAlice[0]}
  //   <br />
  //   Bob: {messagesFromBob[0]}
  //   <br />
  //   <br />
  //   Alice: {messagesFromAlice[1]}
  //   <br />
  //   Bob: {messagesFromBob[1]}
  //   <br />
  //   <br />
  //   Alice: {messagesFromAlice[2]}
  //   <br />
  //   Bob: {messagesFromBob[2]}
  //   <br />
  //   <br />
  // </>);

  // Seemingly this works but the above doesn't – why?

  const openingStatements = (
    <>
      Alice: {aliceOpener}
      <br />
      <br />
      Bob: {bobOpener}
    </>
  );

  const firstAliceResponse = (
    <CompletionComponents.ChatCompletion maxTokens={1000}>
      <CompletionComponents.SystemMessage>
        You are an expert debater. You will make an opening statement first. Then your opponent will make their opening
        statement. Then the two of you will continue to debate.
      </CompletionComponents.SystemMessage>
      {[
        <CompletionComponents.AssistantMessage>{messagesFromAlice[0]}</CompletionComponents.AssistantMessage>,
        <CompletionComponents.UserMessage>{messagesFromBob[0]}</CompletionComponents.UserMessage>,
      ]}
    </CompletionComponents.ChatCompletion>
  );

  messagesFromAlice.push(firstAliceResponse);

  const firstBobResponse = (
    <CompletionComponents.ChatCompletion maxTokens={1000}>
      <CompletionComponents.SystemMessage>
        You are an expert debater. You will make an opening statement first. Then your opponent will make their opening
        statement. Then the two of you will continue to debate, with your opponent replying first.
      </CompletionComponents.SystemMessage>
      <CompletionComponents.AssistantMessage>{messagesFromBob[0]}</CompletionComponents.AssistantMessage>
      <CompletionComponents.UserMessage>{messagesFromAlice[0]}</CompletionComponents.UserMessage>
      <CompletionComponents.UserMessage>{messagesFromAlice[1]}</CompletionComponents.UserMessage>
    </CompletionComponents.ChatCompletion>
  );

  const accumulator = [];
  messagesFromAlice.forEach((messageFromAlice, index) => {
    accumulator.push(
      <>
        Alice: {messageFromAlice}
        <br />
        <br />
        Bob: {messagesFromBob[index]}
        <br />
        <br />
      </>
    );
  });

  console.log(accumulator.flat());
  return <Debug>{accumulator.flat()}</Debug>;

  return (
    <>
      {openingStatements}
      <br />
      <br />
      Alice: {messagesFromAlice[1]}
      <br />
      <br />
      Bob: {firstBobResponse}
    </>
  );
}

// const inFavor = true;
// const position = 'prohibition'
// LLMx.show(
//   <CompletionComponents.ChatCompletion maxTokens={1000}>
//   <CompletionComponents.SystemMessage>
//     You are an expert debater arguing { inFavor ? 'in favor of' : 'against' } the following position: {position}
//     Each opening statement or reply must be two sentences or less.
//   </CompletionComponents.SystemMessage>
//   <CompletionComponents.UserMessage>
//     Make your opening statement.
//   </CompletionComponents.UserMessage>
// </CompletionComponents.ChatCompletion>, {stream: true}
// )

// LLMx.show(
//   <DebateDemo
//     position="Prohibition of alcohol in the 1920s had a positive effect on society in the United States."
//     rounds={1}
//   />,
//   { stream: true }
// );

// console.log('asdf')
// const g = logGeneratorDuration({phase: 'my-gen', level: 'warn'}, async function* gen() {
//   console.log('in gneerator')
//   yield 1;
//   await new Promise(resolve => setTimeout(resolve, 1000))
//   yield 2;
// })
// for await (const x of g) {
//   console.log('x', x);
// }

// LLMx.show(<DebateDemoChat />, { stream: true });
// LLMx.show(<DebateDemoChatWithFirstResponse rounds={1} />, { stream: true });
// LLMx.show(<DebateDemoChatWithFirstResponse rounds={2} />, { stream: true });
// LLMx.show(<Debug>fasdf<Debug>foo</Debug></Debug>)

// const stream = await openAIChat.simpleStream({
//   model: 'gpt-3.5-turbo',
//   max_tokens: 1000,
//   messages: [
//     {role: 'system', content: 'You are a debater'},
//     {role: 'user', content: 'Give me an opening statement in support of prohibition in the 1920s'},
//   ]
// })

// for await (const message of stream) {
//   Log.log.info({message}, 'streamed message')
// }

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
