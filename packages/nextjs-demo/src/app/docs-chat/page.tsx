/** @jsxImportSource ai-jsx/react */
import * as React from 'react';
import Chat from '@/components/Chat';
import ResultContainer from '@/components/ResultContainer';

export default function DocsChat() {
  return (
    <ResultContainer
      title="Docs Chat"
      description={
        <>
          In this demo, you can ask questions about the{' '}
          <a href="https://docs.ai-jsx.com" target="_blank" rel="noopener noreferrer" className="underline">
            AI.JSX documentation
          </a>
          .
        </>
      }
    >
      <Chat initialMessages={[]} placeholder="Ask a question..." endpoint="docs-chat/api" />
    </ResultContainer>
  );
}
