// This script assumes that ./load-articles has been run first.
import { globbySync } from 'globby';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadJsonFile } from 'load-json-file';
import { Docs, DocsComponents, LLMx } from '../../../lib/index.js';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { Article } from './load-articles.mjs';
import _ from 'lodash';
import { showInspector } from '../../../inspector/console.js';

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

const chunkedDocs = await Docs.defaultChunkMany(docs);
const vectorStore = await Docs.DefaultInMemoryVectorStore.fromDocuments(chunkedDocs, new OpenAIEmbeddings());

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
      A: <DocsComponents.DocsQA question={query} loader={loader} docComponent={ShowDoc} />
    </>
  );
}

showInspector(
  <>
    <AskAndAnswer query="What is Loop?" />
    {'\n'}
    {'\n'}
    <AskAndAnswer query="Does Loop offer roadside assistance?" />
    {'\n'}
    {'\n'}
    <AskAndAnswer query="How do I file a claim?" />
  </>
);
