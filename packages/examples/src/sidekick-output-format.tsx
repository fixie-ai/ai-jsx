import * as AI from 'ai-jsx';
import { Sidekick, SidekickProps } from 'ai-jsx/sidekick';
import { ConversationHistoryContext, SystemMessage, UserMessage } from 'ai-jsx/core/conversation';
import { Tool } from 'ai-jsx/batteries/use-tools';

const tools: Record<string, Tool> = {
  lookUpFlight: {
    description: 'Look up a flight',
    parameters: {
      flightNumber: {
        description: 'The flight number',
        type: 'string',
        required: true,
      },
    },
    func: ({ flightNumber }: { flightNumber: string }) =>
      JSON.stringify({
        flightNumber,
        departureTime: '2021-10-31T12:00:00Z',
        arrivalTime: '2021-10-31T13:00:00Z',
        departureAirport: 'SFO',
        arrivalAirport: 'LAX',
      }),
  },
};

const mySystemMessage = (
  <SystemMessage>
    You can do anything a flight assistant can do, including looking up user information and booking new flights.
  </SystemMessage>
);

function MySidekick({
  contentType,
  includeNextStepsRecommendations,
}: {
  contentType: SidekickProps['outputFormat'];
  includeNextStepsRecommendations?: boolean;
}) {
  return (
    // I don't feel like making the types line up.
    // @ts-expect-error
    <Sidekick
      tools={tools}
      outputFormat={contentType}
      systemMessage={mySystemMessage}
      includeNextStepsRecommendations={includeNextStepsRecommendations}
    />
  );
}

const conversation = [
  <UserMessage>Tell me about my flight DL1010. Also, give me a list of cities near my destination.</UserMessage>,
];

console.log(
  await AI.createRenderContext().render(
    <>
      <ConversationHistoryContext.Provider value={conversation}>
        {/* Unfortunately, I couldn't get this to actually output next steps buttons, but I confirmed that the prompt
          is being passed.
         */}
        GenUI output:{'\n'}
        <MySidekick contentType="text/mdx" />
        {'\n\n'}
        GenUI output no next steps:{'\n'}
        <MySidekick contentType="text/mdx" includeNextStepsRecommendations={false} />
        {'\n\n'}
        Markdown output:{'\n'}
        <MySidekick contentType="text/markdown" />
        {'\n\n'}
        Plain text output:{'\n'}
        <MySidekick contentType="text/plain" />
      </ConversationHistoryContext.Provider>
    </>
  )
);
