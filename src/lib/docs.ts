import { Jsonifiable } from 'type-fest';

export interface Document<Metadata extends Jsonifiable = Jsonifiable> {
  pageContent: string;
  metadata: Metadata;
}

/**
 * Split text into multiple documents.
 */
export type Split = <T extends string | Document>(text: T) => Promise<T[]>;

/**
 * Load data from a source.
 */
export type Load = (...args: any[]) => Promise<Document[]>;
