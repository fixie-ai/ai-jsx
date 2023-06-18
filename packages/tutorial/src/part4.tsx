import fetch from 'node-fetch';
import TurndownService from 'turndown';
import * as LLMx from 'ai-jsx';
import { DocsQA, ScoredChunk, LocalCorpus, makeChunker, staticLoader } from 'ai-jsx/batteries/docs';
import { showInspector } from 'ai-jsx/core/inspector';

const URL = 'https://en.wikipedia.org/wiki/Hurricane_Katrina';

const html = await fetch(URL).then((response) => response.text());
const turndownService = new TurndownService();
const markdown = turndownService.turndown(html);
const docs = [
  {
    pageContent: [markdown],
    name: 'Wikipedia Article about Hurricane Katrina',
  },
];
const corpus = new LocalCorpus(staticLoader(docs), makeChunker(600, 100));
await corpus.startLoading();

function ShowDoc({ doc }: { doc: ScoredChunk }) {
  return doc.chunk.content;
}

function App() {
  return (
    <>
      <DocsQA question="What was Hurricane Katrina?" corpus={corpus} limit={5} docComponent={ShowDoc} />
      {'\n\n'}
      <DocsQA question="Which dates did the storm occur?" corpus={corpus} limit={5} docComponent={ShowDoc} />
      {'\n\n'}
      <DocsQA question="Where were the strongest winds reported?" corpus={corpus} limit={5} docComponent={ShowDoc} />
    </>
  );
}

showInspector(<App />);
