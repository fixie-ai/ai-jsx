import { IMSDBLoader } from 'langchain/document_loaders/web/imsdb';
import { LangChainWrapper, log } from '../lib';
import { CharacterTextSplitter } from 'langchain/dist/text_splitter';
const loader = new IMSDBLoader('https://imsdb.com/scripts/BlacKkKlansman.html');
const obserableLoader = new LangChainWrapper.ObservableLangChainDocumentLoader(loader, log);

await obserableLoader.loadAndSplit();

const splitter = new CharacterTextSplitter({
  separator: '\t',
})
console.log(splitter.splitText('foo\tbar\todp'));