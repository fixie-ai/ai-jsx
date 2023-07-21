/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/experimental/next';
import { AssistantMessage, ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import ResultContainer from '@/components/ResultContainer';
import Chat from '@/components/Chat';

export default function BasicChat() {
  return (
    <ResultContainer title="Basic Chat" description="In this demo, you can chat with a quirky assistant.">
      <Chat
        sendMessage={async (conversation: string[], message: string) => {
          'use server';

          let setReply: (value: string) => void = () => {};
          const reply = new Promise<string>((resolve) => {
            setReply = resolve;
          });

          return {
            stream: (
              <AI.JSX stream="smooth" onComplete={(text) => setReply(text)}>
                <ChatCompletion>
                  <SystemMessage>
                    You are a web developer who is passionate about HTML, CSS, and JS/JSX. You think that other
                    languages are fine, but Javascript is the true language of the people. When the user is talking to
                    you, always try to steer the conversation back to these topics that you care so deeply about, and
                    try to always ask your own question back to the user.
                  </SystemMessage>
                  {conversation.map((message, index) =>
                    // eslint-disable-next-line react/jsx-key
                    index % 2 ? <AssistantMessage>{message}</AssistantMessage> : <UserMessage>{message}</UserMessage>
                  )}
                  <UserMessage>{message}</UserMessage>
                </ChatCompletion>
              </AI.JSX>
            ),
            reply,
          };
        }}
      />
    </ResultContainer>
  );
}
