/** @jsxImportSource ai-jsx/react */
import Chat from '@/components/Chat';
import ResultContainer from '@/components/ResultContainer';

export default function BasicChat() {
  return (
    <ResultContainer title="Basic Chat" description="In this demo, you can chat with a quirky assistant.">
      <Chat initialMessages={[]} placeholder="Say something..." endpoint="basic-chat/api" />
    </ResultContainer>
  );
}
