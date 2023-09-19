import * as AI from 'ai-jsx';
import { Sidekick, SidekickProps } from 'ai-jsx/sidekick';
import { ConversationHistoryContext, SystemMessage, UserMessage } from 'ai-jsx/core/conversation';

const mySystemMessage = (
  <SystemMessage>
    Here is information about the user's upcoming flight:
    {`{
    "flightNumber": "UA 123",
    "departureTime": "2021-10-31T12:00:00Z",
    "arrivalTime": "2021-10-31T13:00:00Z",
    "departureAirport": "SFO",
    "arrivalAirport": "LAX"
  }`}
  </SystemMessage>
);

function MySidekick({ contentType }: { contentType: SidekickProps['outputFormat'] }) {
  return <Sidekick role="Flight assistant" outputFormat={contentType} systemMessage={mySystemMessage} />;
}

const conversation = [
  <UserMessage>Tell me about my flight. Also, give me a list of cities near my destination.</UserMessage>,
];

console.log(
  await AI.createRenderContext().render(
    <>
      <ConversationHistoryContext.Provider value={conversation}>
        GenUI output:{'\n'}
        <MySidekick contentType="text/gen-ui" />
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
