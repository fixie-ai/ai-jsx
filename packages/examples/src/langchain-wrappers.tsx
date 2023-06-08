import { IMSDBLoader } from 'langchain/document_loaders/web/imsdb';
import {
  ObservableLangChainTextSplitter,
  ObservableLangChainDocumentLoader,
} from '@fixieai/ai-jsx/batteries/langchain-wrapper';
import log from '@fixieai/ai-jsx/core/log';
import { CharacterTextSplitter } from 'langchain/text_splitter';
const loader = new IMSDBLoader('https://imsdb.com/scripts/BlacKkKlansman.html');
const obserableLoader = new ObservableLangChainDocumentLoader(loader, log);

await obserableLoader.loadAndSplit();

const splitter = new ObservableLangChainTextSplitter(
  new CharacterTextSplitter({
    separator: '\t',
    chunkSize: 7,
    chunkOverlap: 3,
  }),
  log
);

console.log(await splitter.createDocuments(['foo\tbar\todp', 'baz\tqux\todp']));
