/** @jsx LLMx.createElement */
/** @jsxFrag LLMx.Fragment */
/* eslint-disable react/jsx-key */
import * as LLMx from 'ai-jsx';
import React, { useEffect, useRef } from 'react';
import { DocsQA, ScoredChunk, LocalCorpus, defaultChunker, staticLoader } from 'ai-jsx/batteries/docs';
import { memo } from 'ai-jsx/core/memoize';
import { atom, useAtom } from 'jotai';
import TurndownService from 'turndown';

import _ from 'lodash';

export interface ChatMessage {
  type?: string;
  content?: string;
}

export const conversationAtom = atom<ChatMessage[]>([]);
export const modelCallInProgress = atom<boolean>(false);

/*
 * This is a very simple example of how to build a document corpus.
 * We pull the page content from a URL, convert it to Markdown, and then index it.
 */
async function indexCorpus() {
  const url = 'https://docs.ai-jsx.com/guides/brand-new';
  const title = 'Guide for AI Newcomers';
  const response = await fetch(url);
  const markdown = new TurndownService().turndown(await response.text());
  console.log(markdown);
  const docs = [
    {
      pageContent: [markdown],
      name: title,
    },
  ];
  const corpus = new LocalCorpus(staticLoader(docs), defaultChunker);
  await corpus.startLoading();
  return corpus;
}
const corpus = await indexCorpus();

const ShowDoc = ({ doc }: { doc: ScoredChunk }) => (
  <>
    Title: {doc.chunk.documentName ?? 'Untitled'}
    Content: {doc.chunk.content}
  </>
);

function DocsAgent({ conversation }: { conversation: any[] }) {
  const query = _.last(conversation)?.content;
  return <DocsQA question={query} corpus={corpus} limit={5} docComponent={ShowDoc} />;
}

function AI() {
  const [conversation, setConversation] = useAtom(conversationAtom);
  const [, setCallInProgress] = useAtom(modelCallInProgress);
  const isInProgressRef = useRef(false);
  const children = memo(<DocsAgent conversation={conversation} />);
  const when = conversation.length && _.last(conversation)?.type === 'user';

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
        setConversation((prev) => [...prev, { type: 'assistant', content: finalFrame }]);
      });
  }, [children, setCallInProgress, when, setConversation]);

  return null;
}

export function AIRoot() {
  return React.createElement(AI, {});
}
