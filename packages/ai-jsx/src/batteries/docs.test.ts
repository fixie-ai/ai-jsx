import { describe, expect, test } from '@jest/globals';
import { Embeddings } from 'langchain/embeddings/base';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import {
  CorpusLoadingState,
  Document,
  LoadableLangchainCorpus,
  LocalCorpus,
  RawLoader,
  staticLoader,
  toLoader,
} from '../../dist/cjs/batteries/docs.cjs';

test('defaultParser handles simple text', async () => {
  const rawDoc = {
    pageContent: new TextEncoder().encode('Hello world!'),
    name: 'greeting.txt',
    encoding: 'utf-8',
    mimeType: 'text/plain',
  };
  const rawLoader: RawLoader = (_) => Promise.resolve({ page: { documents: [rawDoc] } });
  const loader = toLoader(rawLoader);
  const parsedDoc = (await loader({})).page!.documents[0];
  expect(parsedDoc).toEqual({
    pageContent: ['Hello world!'],
    name: 'greeting.txt',
  });
});

test('staticLoader supports pagination', async () => {
  const docs = [
    { name: 'doc1.txt', pageContent: ['Hello world1!'] },
    { name: 'doc2.txt', pageContent: ['Hello world2!'] },
    { name: 'doc3.txt', pageContent: ['Hello world3!'] },
    { name: 'doc4.txt', pageContent: ['Hello world4!'] },
    { name: 'doc5.txt', pageContent: ['Hello world5!'] },
  ];
  const loader = staticLoader(docs, 2);
  const response1 = await loader({});
  expect(response1.page!.documents).toEqual([docs[0], docs[1]]);
  expect(response1.partitions).toBeUndefined();
  const response2 = await loader({ pageToken: response1.page!.nextPageToken });
  expect(response2.page!.documents).toEqual([docs[2], docs[3]]);
  expect(response2.partitions).toBeUndefined();
  const response3 = await loader({ pageToken: response2.page!.nextPageToken });
  expect(response3.page!.documents).toEqual([docs[4]]);
  expect(response3.page!.nextPageToken).toBeUndefined();
  expect(response3.partitions).toBeUndefined();
});

describe('corpus loading and search', () => {
  const docs = [
    { name: 'doc1.txt', pageContent: ['Hello world1!'] },
    { name: 'doc2.txt', pageContent: ['Hello world2!'] },
    { name: 'doc3.txt', pageContent: ['Hello world3!'] },
    { name: 'doc4.txt', pageContent: ['Hello world4!'] },
    { name: 'doc5.txt', pageContent: ['Hello world5!'] },
  ];
  const loader = staticLoader(docs, 2);
  const chunker = (doc: Document) => {
    const chunkTexts: Array<string> = [];
    doc.pageContent.map((content) => chunkTexts.push(...content.split(' ')));
    return Promise.resolve(chunkTexts.map((text) => ({ content: text, documentName: doc.name })));
  };
  const embedding = {
    embed: (text: string) => {
      switch (text) {
        case 'Hello':
          return Promise.resolve([-1, -1]);
        case 'world1!':
          return Promise.resolve([1, 1]);
        case 'world2!':
          return Promise.resolve([1, 2]);
        case 'world3!':
          return Promise.resolve([1, 3]);
        case 'world4!':
          return Promise.resolve([1, 4]);
        case 'world5!':
          return Promise.resolve([1, 5]);
      }
      throw new Error(`Unexpected text chunk: ${text}`);
    },
    embedBatch: async (texts: Array<string>) => {
      return Promise.all(texts.map((text) => embedding.embed(text)));
    },
  };

  test('LocalCorpus', async () => {
    const corpus = new LocalCorpus(loader, chunker, embedding);
    const stats = await corpus.load();
    expect(stats).toEqual({
      loadingState: CorpusLoadingState.COMPLETED,
      completedPartitions: 1,
      activePartitions: 0,
      numDocuments: 5,
      numChunks: 10,
    });
    const results = await corpus.search('world2!', { limit: 1 });
    expect(results.length).toEqual(1);
    expect(results[0].chunk).toEqual({
      content: 'world2!',
      documentName: 'doc2.txt',
    });
  });

  test('LangChainCorpus', async () => {
    class FakeEmbeddings extends Embeddings {
      async embedQuery(text: string): Promise<number[]> {
        return embedding.embed(text);
      }
      async embedDocuments(texts: string[]): Promise<number[][]> {
        return embedding.embedBatch(texts);
      }
    }
    const vectorStore = new MemoryVectorStore(new FakeEmbeddings({}));
    const corpus = new LoadableLangchainCorpus(vectorStore, loader, chunker);
    const stats = await corpus.load();
    expect(stats).toEqual({
      loadingState: CorpusLoadingState.COMPLETED,
      completedPartitions: 1,
      activePartitions: 0,
      numDocuments: 5,
      numChunks: 10,
    });
    const results = await corpus.search('world2!', { limit: 1 });
    expect(results.length).toEqual(1);
    expect(results[0].chunk).toEqual({
      content: 'world2!',
      metadata: {},
    });
  });
});
