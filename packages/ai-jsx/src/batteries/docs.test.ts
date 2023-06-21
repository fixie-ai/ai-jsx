import { expect, test } from '@jest/globals';
import { RawLoader, staticLoader, toLoader } from '../../dist/cjs/batteries/docs.cjs';

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

// Corpus loading (custom chunker and embedding), local and LC
// Query for not read local corpus
// Query for local corpus
// Query for LC corpus
// Ideally DocsQA component if we can mock out ChatCompletion
