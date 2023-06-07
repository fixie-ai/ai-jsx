import { BaseDocumentLoader, DocumentLoader } from 'langchain/document_loaders/base';
import { Log } from '../core/log.ts';
import { Document as LangChainDocument } from 'langchain/document';
import { TextSplitter, TextSplitterChunkHeaderOptions } from 'langchain/text_splitter';

export class ObservableLangChainDocumentLoader implements DocumentLoader {
  constructor(private readonly loader: BaseDocumentLoader, private readonly log: Log) {}

  load(): Promise<LangChainDocument[]> {
    return this.log.docLoad(() => this.loader.load());
  }

  loadAndSplit(splitter?: TextSplitter): Promise<LangChainDocument[]> {
    return this.log.docLoadAndSplit(() => this.loader.loadAndSplit(splitter));
  }
}

export type LangChainTextSplitter = Pick<TextSplitter, 'splitDocuments' | 'createDocuments'>;

export class ObservableLangChainTextSplitter implements LangChainTextSplitter {
  constructor(private readonly splitter: LangChainTextSplitter, private readonly log: Log) {}

  splitDocuments(docs: LangChainDocument[]): Promise<LangChainDocument[]> {
    return this.log.splitDocs(docs, () => this.splitter.splitDocuments(docs));
  }

  createDocuments(
    texts: string[],
    metadatas?: Record<string, any>[],
    chunkHeaderOptions?: TextSplitterChunkHeaderOptions
  ): Promise<LangChainDocument[]> {
    return this.log.createDocs(texts, metadatas, chunkHeaderOptions, () =>
      this.splitter.createDocuments(texts, metadatas, chunkHeaderOptions)
    );
  }
}
