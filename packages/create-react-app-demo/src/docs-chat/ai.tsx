/** @jsxImportSource ai-jsx/react */
import { DocsQA, DefaultFormatter, LocalCorpus, defaultChunker, staticLoader } from 'ai-jsx/batteries/docs';

let globalCorpus: LocalCorpus | undefined;

/**
 * This is a very simple example of how to build a document corpus.
 * We pull markdown content from a set of URLs and then index it.
 */
export async function indexCorpus() {
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
  const stats = await corpus.startLoading();
  console.log(`Finished indexing documents, chunk count=${stats.numChunks}`);
  return corpus;
}

/**
 * Build the corpus on the first query, then use it for all subsequent queries.
 */
export async function DocsAgent({ question }: { question: string }) {
  if (!globalCorpus) {
    globalCorpus = await indexCorpus();
  }
  return <DocsQA question={question} corpus={globalCorpus} chunkLimit={5} chunkFormatter={DefaultFormatter} />;
}
