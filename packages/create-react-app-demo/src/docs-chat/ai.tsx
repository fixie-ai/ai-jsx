/** @jsx AI.createElement */
/** @jsxFrag AI.Fragment */
import * as AI from 'ai-jsx';
import { DocsQA, ScoredChunk, LocalCorpus, defaultChunker, staticLoader } from 'ai-jsx/batteries/docs';
// @ts-expect-error
import markdownPath from './brand-new.md';

// For now, we load the ai.jsx docs from a local markdown file. Once we have a HTML->Markdown converter,
// we can load the docs from the site directly.
const docResponse = await fetch(markdownPath);
const docText = await docResponse.text();
const docs = [
  {
    pageContent: [docText],
    name: 'Guide for AI Newcomers',
  },
];
const corpus = new LocalCorpus(staticLoader(docs), defaultChunker);

const corpusLoadedPromise = corpus.startLoading();

const ShowDoc = ({ doc }: { doc: ScoredChunk }) => (
  <>
    Title: {doc.chunk.documentName ?? 'Untitled'}
    Content: {doc.chunk.content}
  </>
);

export async function DocsAgent({ question }: { question: string }) {
  await corpusLoadedPromise;
  return <DocsQA question={question} corpus={corpus} limit={5} docComponent={ShowDoc} />;
}
