import { ApolloClient } from '@apollo/client/core/ApolloClient.js';
import { IsomorphicFixieClient } from './isomorphic-client.js';
import type { Jsonifiable } from 'type-fest';
/**
 * A client to the Fixie AI platform.
 *
 * This client can only be used in NodeJS.
 */
export declare class FixieClient extends IsomorphicFixieClient {
    static Create(url?: string, apiKey?: string): FixieClient;
    static CreateWithoutApiKey(url: string): FixieClient;
    /** Return a GraphQL client for the Fixie API. */
    gqlClient(): ApolloClient<any>;
    /** Add a new static file Source to a Corpus. */
    addFileCorpusSource(corpusId: string, filenames: string[], mimeType: string): Promise<Jsonifiable>;
}
