// @ts-nocheck
/** @jsx LLMx.createElement */
/** @jsxFrag LLMx.Fragment */
/* eslint-disable react/jsx-key */
import * as LLMx from 'ai-jsx';
import React, { useEffect, useRef } from 'react';
import { DocsQA, Document, LocalCorpus, defaultChunker, staticLoader } from 'ai-jsx/batteries/docs';
import { memo } from 'ai-jsx/core/memoize';
import markdownPath from './brand-new.md';
import { atom, useAtom } from 'jotai';

import _ from 'lodash';

export class ChatMessage {
  type: string;
  content: string;
}

export const conversationAtom = atom<ChatMessage[]>([]);
export const modelCallInProgress = atom<boolean>(false);

class Metadata {
  title: string;
  url: string;
  name: string;
}

const docText = await fetch(markdownPath).then((res) => res.text());
const docs = [{
  pageContent: [docText],
  name: 'Guide for AI Newcomers',
}];
const corpus = new LocalCorpus(staticLoader(docs), defaultChunker);
await corpus.startLoading();

function ShowDoc({ doc }: { doc: Document<Metadata> }) {
  console.log('doc', doc.chunk.content);
  return (
    <>
      Title: { doc.name ?? 'Untitled'}
      Content: {doc.chunk.content}
    </>
  );
}

function ChatAgent({ conversation }: { conversation: any[] }) {
  const query = _.last(conversation)?.content;
  return <DocsQA question={query} corpus={corpus} docComponent={ShowDoc} />;
}

function AI() {
  const [conversation, setConversation] = useAtom(conversationAtom);
  const [, setCallInProgress] = useAtom(modelCallInProgress);
  const isInProgressRef = useRef(false);
  const children = memo(<ChatAgent conversation={conversation} />);
  const when = conversation.length && _.last(conversation).type === 'user';

  useEffect(() => {
    if (isInProgressRef.current || !when) {
      return;
    }
    setCallInProgress(true);
    isInProgressRef.current = true;
    // I couldn't get streaming to work here and I don't know why.
    // Maybe because we're in the client and however Axios is doing it only works in Node?
    LLMx.createRenderContext()
      .render(children)
      .then((finalFrame) => {
        isInProgressRef.current = false;
        setCallInProgress(false);
        setConversation((prev) => [
          ...prev,
          {
            type: 'assistant',
            content: finalFrame,
          },
        ]);
      });
  }, [children, setCallInProgress, when, setConversation]);

  return null;
}

export function AIRoot() {
  return React.createElement(AI, {});
}
