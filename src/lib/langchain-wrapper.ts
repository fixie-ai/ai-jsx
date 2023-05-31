import { BaseDocumentLoader, DocumentLoader } from 'langchain/dist/document_loaders/base';
import { default as log, Log } from './log';
import { Document } from 'langchain/dist/document';
import { TextSplitter } from 'langchain/dist/text_splitter';

export class ObservableLangChainDocumentLoader implements DocumentLoader {
  constructor(private readonly loader: BaseDocumentLoader, private readonly log: Log) {}

  load(): Promise<Document[]> {
    return this.log.docLoad(() => this.loader.load());
  }

  loadAndSplit(splitter?: TextSplitter): Promise<Document[]> {
    return this.log.docLoadAndSplit(() => this.loader.loadAndSplit(splitter));
  }
}

import { IMSDBLoader } from 'langchain/document_loaders/web/imsdb';
const loader = new IMSDBLoader('https://imsdb.com/scripts/BlacKkKlansman.html');
const obserableLoader = new ObservableLangChainDocumentLoader(loader, log);

await obserableLoader.loadAndSplit();
