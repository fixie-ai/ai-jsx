import { IMSDBLoader } from 'langchain/document_loaders/web/imsdb';
import { LangChainWrapper, log } from '../lib';
import { CharacterTextSplitter } from 'langchain/text_splitter';
const loader = new IMSDBLoader('https://imsdb.com/scripts/BlacKkKlansman.html');
const obserableLoader = new LangChainWrapper.ObservableLangChainDocumentLoader(loader, log);

await obserableLoader.loadAndSplit();

const splitter = new LangChainWrapper.ObservableLangChainTextSplitter(
  new CharacterTextSplitter({
    separator: '\t',
    chunkSize: 7,
    chunkOverlap: 3,
  }),
  log
);

console.log(await splitter.createDocuments(['foo\tbar\todp', 'baz\tqux\todp']));
