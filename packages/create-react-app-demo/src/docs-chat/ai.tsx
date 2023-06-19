/** @jsxImportSource ai-jsx/react */
import { DefaultFormatter, DocsQA, LocalCorpus, defaultChunker, staticLoader } from 'ai-jsx/batteries/docs';
import _ from 'lodash';

/**
 * This is a very simple example of how to build a document corpus.
 * We pull markdown content from a set of URLs and then index it.
 * Note the use of once() to ensure we cache the indexing result.
 */
const indexCorpus = _.once(async () => {
  const files = {
    'getting-started.md': 'Getting Started',
    'guides/ai-ui.md': 'AI + UI',
    'guides/brand-new.md': 'Guide for AI Newcomers',
    'guides/docsqa.md': 'Docs QA: Grounding Answers',
    'guides/esm.md': 'ESM',
    'guides/jsx.md': 'JSX: Build System Considerations',
    'guides/observability.md': 'Observability',
    'guides/prompting.md': 'Getting the AI to say things',
    'guides/rules-of-jsx.md': 'Rules of AI.JSX',
  };
  const docs = await Promise.all(
    Object.entries(files).map(async ([path, title]) => {
      const url = `https://raw.githubusercontent.com/fixie-ai/ai-jsx/main/packages/docs/docs/${path}`;
      const response = await fetch(url);
      const markdown = await response.text();
      console.log(`Retrieved document from ${url}`);
      return {
        pageContent: [markdown],
        name: title,
      };
    })
  );
  const corpus = new LocalCorpus(staticLoader(docs), defaultChunker);
  const stats = await corpus.load();
  console.log(`Finished indexing documents, chunk count=${stats.numChunks}`);
  return corpus;
});

export async function DocsAgent({ question }: { question: string }) {
  return <DocsQA question={question} corpus={await indexCorpus()} chunkLimit={5} chunkFormatter={DefaultFormatter} />;
}
