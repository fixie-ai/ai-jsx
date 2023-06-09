// This script assumes that ./load-articles has been run first.
import { DocsQA, Document, LocalCorpus, defaultChunker, staticLoader } from 'ai-jsx/batteries/docs';
import { showInspector } from 'ai-jsx/core/inspector';
import { globbySync } from 'globby';
import { loadJsonFile } from 'load-json-file';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonObject } from 'type-fest';
import { Article } from './load-articles.mjs';

const dirname = path.dirname(fileURLToPath(import.meta.url));

type MustBeJsonObject<T> = T extends JsonObject ? T : never;
type RedditMetadata = MustBeJsonObject<{
  title: string;
  id: number;
  url: string;
  html_url: string;
  name: string;
}>;

const dataFiles = globbySync(path.join(dirname, 'data', '*.json'));
const docs = await Promise.all(
  dataFiles.map(async (dataFile) => {
    const { body, ...rest } = (await loadJsonFile(dataFile)) as Article;
    return {
      pageContent: [body as string],
      name: dataFile,
      metadata: rest,
    } as Document<RedditMetadata>;
  })
);
if (docs.length === 0) {
  throw Error('No documents available. Did you run load-articles first?');
}

const corpus = new LocalCorpus(staticLoader(docs), defaultChunker);
await corpus.load();

function AskAndAnswer({ query }: { query: string }) {
  return (
    <>
      Q: {query}
      {'\n'}
      A: <DocsQA question={query} corpus={corpus} chunkLimit={5} />
    </>
  );
}

showInspector(
  <>
    <AskAndAnswer query="What is Reddit?" />
    {'\n'}
    {'\n'}
    <AskAndAnswer query="How do I create a subreddit?" />
    {'\n'}
    {'\n'}
    <AskAndAnswer query="Can I trust everything that I find on Reddit?" />
  </>
);
