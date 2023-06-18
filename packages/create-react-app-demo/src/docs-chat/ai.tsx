/** @jsx AI.createElement */
/** @jsxFrag AI.Fragment */
import * as AI from 'ai-jsx';
import { DocsQA, ScoredChunk, LocalCorpus, defaultChunker, staticLoader } from 'ai-jsx/batteries/docs';

/*
 * This is a very simple example of how to build a document corpus.
 * We pull the page content from a URL, convert it to Markdown, and then index it.
 */
async function indexCorpus() {
  const url = 'https://raw.githubusercontent.com/fixie-ai/ai-jsx/main/packages/docs/docs/guides/brand-new.md';
  const title = 'Guide for AI Newcomers';
  const response = await fetch(url);
  const markdown = await response.text();
  const docs = [
    {
      pageContent: [markdown],
      name: title,
    },
  ];
  const corpus = LocalCorpus(staticLoader(docs), defaultChunker);
  await corpus.startLoading();
  return corpus;
}

const ShowDoc = ({ doc }: { doc: ScoredChunk }) => (
  <>
    Title: {doc.chunk.documentName ?? 'Untitled'}
    Content: {doc.chunk.content}
  </>
);

export async function DocsAgent({ question }: { question: string }) {
  const corpus = await indexCorpus();
  return <DocsQA question={question} corpus={corpus} limit={5} docComponent={ShowDoc} />;
}
