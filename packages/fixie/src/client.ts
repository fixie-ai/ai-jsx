import { ApolloClient } from '@apollo/client/core/ApolloClient.js';
import { InMemoryCache } from '@apollo/client/cache/inmemory/inMemoryCache.js';
import createUploadLink from 'apollo-upload-client/public/createUploadLink.js';
import isExtractableFile from 'apollo-upload-client/public/isExtractableFile.js';
import { ExtractableFile } from 'extract-files';
import { ReadStream } from 'fs';
import { IsomorphicFixieClient } from './isomorphic-client.js';

/**
 * A client to the Fixie AI platform.
 * 
 * This client can only be used in NodeJS.
 */
export class FixieClient extends IsomorphicFixieClient {

  static Create(url: string, apiKey?: string) {
    return IsomorphicFixieClient.Create(url, apiKey);
  }

  static CreateWithoutApiKey(url: string) {
    return IsomorphicFixieClient.CreateWithoutApiKey(url);
  }

  /** Return a GraphQL client for the Fixie API. */
  gqlClient(): ApolloClient<any> {
    // For GraphQL operations, we use an ApolloClient with the apollo-upload-client
    // extension to allow for file uploads.
    return new ApolloClient({
      cache: new InMemoryCache(),
      // We're using the apollo-upload-client extension to allow for file uploads.
      // See: https://stackoverflow.com/questions/69627539/uploading-a-local-file-from-nodejs-to-rails-graphql-backend-server-to-server
      link: createUploadLink({
        uri: `${this.url}/graphql`,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        FormData,
        isExtractableFile: (value): value is ExtractableFile =>
          isExtractableFile(value) || (typeof ReadStream !== 'undefined' && value instanceof ReadStream),
      }),
    });
  }
}