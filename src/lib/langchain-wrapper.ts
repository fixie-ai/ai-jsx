import {BaseDocumentLoader, DocumentLoader} from 'langchain/dist/document_loaders/base'
import { default as log, Log } from './log';
import { Document } from 'langchain/dist/document';
import { TextSplitter } from 'langchain/dist/text_splitter';

export class ObservableLangChainDocumentLoader implements DocumentLoader {
  private loader: BaseDocumentLoader;
  private log: Log;

  constructor(loader: BaseDocumentLoader, log: Log) {
    this.loader = loader;
    this.log = log;
  }

  async load(): Promise<Document[]> {
    this.log.debug('load');
    return this.loader.load();
  }

  async loadAndSplit(splitter?: TextSplitter): Promise<Document[]> {
    this.log.debug('loadAndSplit');
    return this.loader.loadAndSplit(splitter);
  }
}

import { IMSDBLoader } from "langchain/document_loaders/web/imsdb";
const loader = new IMSDBLoader('https://imsdb.com/scripts/BlacKkKlansman.html');
const obserableLoader = new ObservableLangChainDocumentLoader(loader, log);

await obserableLoader.load();


// export function observableDocumentLoader<Loader extends BaseDocumentLoader>(loader: Constructor<Loader>, log: Log): Class<Loader> {
//   return class ObservableDocumentLoader extends loader {
//     constructor(...args: any[]) {
//       super(...args);

//       if (super.load) {
//         this.load = async () => {
//           log.debug('load');
//           return super.load();
//         }
//       }
//     }
//     loadAndSplit(splitter?: TextSplitter | undefined): Promise<Document[]> {
//       log.debug('loadAndSplit');
//       return super.loadAndSplit(splitter);
//     }

    
//   }
// }

// import { IMSDBLoader } from "langchain/document_loaders/web/imsdb";
// import { Class, Constructor } from 'type-fest';
// observableDocumentLoader({IMSDBLoader}, log);

// const Observed = observableDocumentLoader(IMSDBLoader, log);
// new IMSDBLoader('asdf');
// const loader = new Observed('asdf', 123);

// function createLoggedSubclass<T extends BaseDocumentLoader>(baseClass: new () => T): new () => T & {
//   load: () => Promise<Document[]>;
//   loadAndSplit: (
//     splitter?: TextSplitter
//   ) => Promise<Document[]>;
// } {
//   return class extends baseClass {
//     async load(): Promise<Document[]> {
//       console.log('in proxy: load');
//       return super.load();
//     }

//     async loadAndSplit(
//       splitter: TextSplitter = new RecursiveCharacterTextSplitter()
//     ): Promise<Document[]> {
//       console.log('in proxy: loadAndSplit');
//       return super.loadAndSplit(splitter);
//     }
//   };
// }

// class CustomDocumentLoader extends BaseDocumentLoader {
//   async load(): Promise<Document[]> {
//     // Custom implementation
//     return [];
//   }
// }

// const LoggedCustomDocumentLoader = createLoggedSubclass(CustomDocumentLoader);
// const loggedLoader = new LoggedCustomDocumentLoader();

// loggedLoader.load(); // Logs "in proxy: load" and calls the original load method
// loggedLoader.loadAndSplit(); //