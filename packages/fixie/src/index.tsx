import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';

class ClientMessage {
  constructor(public role: string, public text: string) {}
}

class AgentQuery {
  constructor(public sessionId: string, public messages: ClientMessage[], public timeZoneOffset: string) {}
}


export default function HelloWorld({ messages }: AgentQuery) {
  return (
    <ChatCompletion temperature={1}>
      <SystemMessage>Respond to the user using some variant of the phrase "Hello World!". Be creative!</SystemMessage>
      <UserMessage>{messages[messages.length-1].text}</UserMessage>
    </ChatCompletion>
  );
}
