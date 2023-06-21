/** @jsxImportSource ai-jsx/react */
import { DocsQA, LocalCorpus, defaultChunker, staticLoader } from 'ai-jsx/batteries/docs';
import _ from 'lodash';

/**
 * This is a very simple example of how to build a document corpus.
 * We pull markdown content from a set of URLs and then index it.
 * Note the use of once() to ensure we cache the indexing result.
 */
const indexCorpus = _.once(async () => {
  const files = [
    'getting-started.md',
    'is-it-react.md',
    'is-it-langchain.md',
    'guides/ai-ui.md',
    'guides/brand-new.md',
    'guides/docsqa.md',
    'guides/esm.md',
    'guides/jsx.md',
    'guides/observability.md',
    'guides/prompting.md',
    'guides/rules-of-jsx.md',
    'tutorial/part1.md',
    'tutorial/part2.md',
    'tutorial/part3.md',
    'tutorial/part4.md',
    'contributing/index.md',
    'contributing/working-in-the-repo.md',
    'api/modules.md',
    'api/namespaces/JSX.md',
    'api/index.md',
    'api/interfaces/Context.md',
    'api/interfaces/JSX.ElementChildrenAttribute.md',
    'api/interfaces/ComponentContext.md',
    'api/interfaces/JSX.Element.md',
    'api/interfaces/IndirectNode.md',
    'api/interfaces/JSX.IntrinsicElements.md',
    'api/interfaces/Element.md',
    'api/interfaces/RenderContext.md',
  ];

  const docs = await Promise.all(
    files.map(async (path) => {
      const url = `https://raw.githubusercontent.com/fixie-ai/ai-jsx/main/packages/docs/docs/${path}`;
      const response = await fetch(url);
      const markdown = await response.text();
      const titleMatch = markdown.match(/# (.*)/);
      const title = titleMatch ? titleMatch[1] : 'Untitled';
      console.log(`Retrieved document from ${url}, title=${title}`);
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
  return <DocsQA question={question} corpus={await indexCorpus()} chunkLimit={5} />;
}
