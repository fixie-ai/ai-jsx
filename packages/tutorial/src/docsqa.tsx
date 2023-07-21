import { DocsQA, DocsQAWithSources, LocalCorpus, QAWithSourcesResult, ScoredChunk, makeChunker, staticLoader } from 'ai-jsx/batteries/docs';
import { showInspector } from 'ai-jsx/core/inspector';
import fetch from 'node-fetch';
import TurndownService from 'turndown';

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
await corpus.load();

function OptionalCustomChunkFormatter({ doc }: { doc: ScoredChunk }) {
  /**
   * This presents document chunks as a simple string with the chunk's contents instead of
   * formatting it with metadata like a title.
   *
   * Note that not including a title makes it difficult to use DocsQAWithSources since the LLM
   * won't know how to refer to this doc.
   */
  return doc.chunk.content;
}

function OptionalCustomResultFormatter(result: QAWithSourcesResult) {
  /**
   * The formats the result of a DocsQAWithSources call to present the answer and sources as
   * desired.
   */
  const linkedSources = result.sources?.map((source: string) => {
    if (source == 'Wikipedia Article about Hurricane Katrina') {
      return `<a href="${URL}">${source}</a>`;
    }
    return source;
  }) || [];

  if (linkedSources.length) {
    return `${result.answer} (from ${linkedSources.join(', ')})`;
  }
  return result.answer;
}

function App() {
  return (
    <>
      <DocsQAWithSources question="What was Hurricane Katrina?" corpus={corpus} chunkLimit={5} />
      {'\n\n'}
      <DocsQA question="Which dates did the storm occur?" corpus={corpus} chunkLimit={5} chunkFormatter={OptionalCustomChunkFormatter}/>
      {'\n\n'}
      <DocsQAWithSources
        question="Where were the strongest winds reported?"
        corpus={corpus}
        chunkLimit={5}
        resultFormatter={OptionalCustomResultFormatter}
      />
    </>
  );
}

showInspector(<App />);
