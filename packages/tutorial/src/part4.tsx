import fetch from 'node-fetch';
import { htmlToText } from 'html-to-text';
import * as LLMx from 'ai-jsx';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { DocsQA, ScoredChunk, LocalCorpus, makeChunker, staticLoader } from 'ai-jsx/batteries/docs';
import { memo } from 'ai-jsx/core/memoize';
import { showInspector } from 'ai-jsx/core/inspector';

const URL = 'https://en.wikipedia.org/wiki/2005_Azores_subtropical_storm';

const html = await fetch(URL).then((response) => response.text());
const plainText = htmlToText(html);
const docs = [
  {
    pageContent: [plainText],
    name: 'Wikipedia Article about 2005 Azores subtropical storm',
  },
];
const corpus = new LocalCorpus(staticLoader(docs), makeChunker(300, 100));
await corpus.startLoading();

function ShowDoc({ doc }: { doc: ScoredChunk }) {
  return doc.chunk.content;
}

function App() {
  return (
    <>
      <DocsQA question="Summarize this article in a few sentences." corpus={corpus} docComponent={ShowDoc} />
      {'\n\n'}
      <DocsQA question="Which dates did the storm occur?" corpus={corpus} docComponent={ShowDoc} />
      {'\n\n'}
      <DocsQA question="Where were the strongest winds reported?" corpus={corpus} docComponent={ShowDoc} />
    </>
  );
}

showInspector(<App />);
