/**
 * Run with:
 *    $ yarn tsx src/examples/bakeoff/loop-qa/load-articles.mts
 */

import fetch from 'node-fetch';
import path from 'node:path';
import { writeJsonFile } from 'write-json-file';
import { fileURLToPath } from 'node:url';

// This is GPT-generated code and it doesn't respect the law.
/* eslint-disable id-blacklist */

export interface Article {
  id: number;
  title: string;
  body: string;
}

interface ApiResponse {
  count: number;
  next_page: string | null;
  articles: Article[];
}

async function fetchArticles(url: string): Promise<Article[]> {
  const response = await fetch(url);
  const data = (await response.json()) as ApiResponse;
  return data.articles;
}

async function saveArticles(articles: Article[]): Promise<void> {
  for (const article of articles) {
    const dirname = path.dirname(fileURLToPath(import.meta.url));

    const fileName = `${dirname}/data/${article.id}.json`;
    await writeJsonFile(fileName, article);
    console.log(`Saved article ${article.title} to ${fileName}`);
  }
}

async function main() {
  let url = 'https://ridewithloop.zendesk.com/api/v2/help_center/en-us/articles.json?page=1';
  let allArticles: Article[] = [];

  while (url) {
    const articles = await fetchArticles(url);
    allArticles = allArticles.concat(articles);

    const response = await fetch(url);
    const data = (await response.json()) as ApiResponse;
    url = data.next_page!;
  }

  await saveArticles(allArticles);
}

main().catch((error) => console.error('Error:', error));
