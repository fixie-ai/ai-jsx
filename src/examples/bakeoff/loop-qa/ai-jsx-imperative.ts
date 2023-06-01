// This script assumes that ./load-articles has been run first.
import { globbySync } from 'globby';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadJsonFile } from 'load-json-file';
import { Docs, Models } from '../../../lib';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { Article } from './load-articles.mjs';

// @ts-expect-error Ignore the TS error because this file will not be built for CommonJS.
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

async function main() {
  async function askAndAnswer(query: string) {
    const searchResults = await vectorStore.search(query, { limit: 3 });

    const response = await Models.openAIChat({
      model: 'gpt-3.5-turbo',
      max_tokens: 1000,
      messages: [
        { role: 'system', content: 'You are a customer service agent. Answer questions truthfully.' },
        {
          role: 'assistant',
          content: `Here is what I know:
        
        ${searchResults.map(
          ({ document }) => `
          ${document.metadata?.title}
          ${document.pageContent}
        `
        )}
        `,
        },
        { role: 'user', content: query },
      ],
    });

    console.log('Q:', query);
    console.log('A:', response.choices[0].message?.content);
    console.log();
  }
  await Promise.all([
    askAndAnswer('What is Loop?'),
    askAndAnswer('Does Loop offer roadside assistance?'),
    askAndAnswer('How do I file a claim?'),
  ]);
}

main();
