/**
 * This is a simple demo showing how to query a corpus of documents through the Fixie service.
 * The app only sends a single query to a corpus, and dumps out the raw text of the top 4 chunks.
 */

import { ScoredChunk, FixieCorpus } from 'ai-jsx/batteries/docs';
import { showInspector } from 'ai-jsx/core/inspector';

import promptly from 'promptly';
const { prompt } = promptly;

function ChunkFormatter({ doc }: { doc: ScoredChunk<any> }) {
  return (
    <>
      {'\n'}```chunk{'\n'}
      {doc.chunk.content.replaceAll('```', '\\`\\`\\`')}
      {'\n'}```{'\n'}
    </>
  );
}

async function App({ corpusId }: { corpusId: string }) {
  const corpus = new FixieCorpus(corpusId);

  const query = 'How do I write a chatbot in AI.JSX?';
  const results = await corpus.search(query, { limit: 4 });

  return results.map((chunk) => <ChunkFormatter doc={chunk} />);
}

  const corpusId = await prompt('Fixie Corpus ID: ');
  showInspector(<App corpusId={corpusId} />);
