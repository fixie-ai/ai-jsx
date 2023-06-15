// This script assumes that ./load-articles has been run first.
import { globbySync } from 'globby';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadJsonFile } from 'load-json-file';
import * as LLMx from 'ai-jsx';
import { DocsQA, defaultChunkMany, DefaultInMemoryVectorStore } from 'ai-jsx/batteries/docs';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { Article } from './load-articles.mjs';
import _ from 'lodash';
import { showInspector } from 'ai-jsx/core/inspector';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const dataFiles = globbySync(path.join(dirname, 'data', '*.json'));
const docs = await Promise.all(
  dataFiles.map(async (dataFile) => {
    const { body, ...rest } = (await loadJsonFile(dataFile)) as Article;
    return {
      pageContent: body as string,
      metadata: rest,
    };
  })
);

const chunkedDocs = await defaultChunkMany(docs);
const vectorStore = await DefaultInMemoryVectorStore.fromDocuments(chunkedDocs, new OpenAIEmbeddings() as any);

function ShowDoc({ doc }: { doc: (typeof docs)[0] }) {
  return (
    <>
      Title: {doc.metadata.title}
      Content: {doc.pageContent}
    </>
  );
}

function AskAndAnswer({ query }: { query: string }) {
  const loader = async () => _.map(await vectorStore.search(query, { limit: 3 }), 'document');
  return (
    <>
      Q: {query}
      {'\n'}
      A: <DocsQA question={query} loader={loader} docComponent={ShowDoc} />
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
