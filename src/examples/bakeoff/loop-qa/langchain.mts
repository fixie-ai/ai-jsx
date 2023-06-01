// This script assumes that ./load-articles has been run first.

import { OpenAI } from 'langchain/llms/openai';
import { RetrievalQAChain } from 'langchain/chains';
import { PromptTemplate } from 'langchain/prompts';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globbySync } from 'globby';
import { loadJsonFile } from 'load-json-file';
import { CharacterTextSplitter } from 'langchain/text_splitter';
import { Article } from './load-articles.mjs';

// Initialize the LLM to use to answer the question.
const model = new OpenAI();
const dirname = path.dirname(fileURLToPath(import.meta.url));

// This won't work – for each loaded document, the JSONLoader will randomly (?) pick a field
// (e.g. `url`, `created_at`, `body`, etc) to be the `pageContents`. That produces totally broken results.
// const loader = new DirectoryLoader(path.join(dirname, 'data'), {
//   '.json': (path) => new JSONLoader(path),
// });
// const docs = await loader.load();

const dataFiles = globbySync(path.join(dirname, 'data', '*.json'));
const docs = await Promise.all(
  dataFiles.map(async (dataFile) => {
    const { body, ...rest } = (await loadJsonFile(dataFile)) as Article;
    return {
      pageContent: body,
      metadata: rest,
    };
  })
);

const splitter = new CharacterTextSplitter();
const splitDocs = await splitter.splitDocuments(docs);

// Create a vector store from the documents.
const vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, new OpenAIEmbeddings());

// Create a chain that uses the OpenAI LLM and HNSWLib vector store.
const qaChain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), {
  prompt: new PromptTemplate({
    template: `You are a customer service agent. Answer questions truthfully.
    Question: {question}`,
    inputVariables: ['question'],
  }),
});

async function main() {
  async function askAndAnswer(query: string) {
    const { text: answer } = await qaChain.call({ query });

    console.log('Q:', query);
    console.log(answer);
    console.log();
  }

  await Promise.all([
    askAndAnswer('What is Loop?'),
    askAndAnswer('Does Loop offer roadside assistance?'),
    askAndAnswer('How do I file a claim?'),
  ]);
}

main();
