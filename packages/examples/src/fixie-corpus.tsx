/**
 * This is a simple demo showing how to query a corpus of documents through the Fixie service. 
 * The app only sends a single query to a corpus, and dumps out the raw text of the top 4 chunks.
 */

import { ScoredChunk, FixieCorpus } from 'ai-jsx/batteries/docs';
import { showInspector } from 'ai-jsx/core/inspector';

// This is the corpus ID for the docs.ai-jsx.com corpus.
const FIXIE_CORPUS_ID = '07d42038-0c0c-4108-8b9e-163e0a4ce683';

function ChunkFormatter({ doc }: { doc: ScoredChunk<any> }) {
  return (
    <>
      {'\n\n'}Chunk from source: {doc.chunk.metadata?.source}
      {'\n'}```chunk{'\n'}
      {doc.chunk.content.replaceAll('```', '\\`\\`\\`')}
      {'\n'}```{'\n'}
    </>
  );
}

async function App() {
  const corpus = new FixieCorpus(FIXIE_CORPUS_ID);

  const query = 'How do I write a chatbot in AI.JSX?';
  const results = await corpus.search(query, { limit: 4 });

  return (
    <>
      {results.map((chunk) => (
        <ChunkFormatter doc={chunk} />
      ))}
    </>
  );
}

showInspector(<App />);
