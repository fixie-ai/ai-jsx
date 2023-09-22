import { ApolloClient } from '@apollo/client/core/ApolloClient.js';
import { InMemoryCache } from '@apollo/client/cache/inmemory/inMemoryCache.js';
import createUploadLink from 'apollo-upload-client/public/createUploadLink.js';
import isExtractableFile from 'apollo-upload-client/public/isExtractableFile.js';
import { ExtractableFile } from 'extract-files';
import fs, { ReadStream } from 'fs';
import { IsomorphicFixieClient } from './isomorphic-client.js';
import type { Jsonifiable } from 'type-fest';
import path from 'path';

/**
 * A client to the Fixie AI platform.
 *
 * This client can only be used in NodeJS.
 */
export class FixieClient extends IsomorphicFixieClient {
  static Create(url?: string, apiKey?: string): FixieClient {
    const urlToUse = url ?? process.env.FIXIE_API_URL ?? 'https://api.fixie.ai';
    const apiKeyToUse = apiKey ?? process.env.FIXIE_API_KEY;
    if (!apiKeyToUse) {
      throw new Error(
        'You must pass apiKey to the constructor, or set the FIXIE_API_KEY environment variable. The API key can be found at: https://console.fixie.ai/profile'
      );
    }
    return new this(urlToUse, apiKeyToUse);
  }

  static CreateWithoutApiKey(url: string): FixieClient {
    return new this(url);
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

  /** Add a new static file Source to a Corpus. */
  addFileCorpusSource(corpusId: string, filenames: string[], mimeType: string): Promise<Jsonifiable> {
    const body = {
      corpus_id: corpusId,
      source: {
        corpus_id: corpusId,
        load_spec: {
          max_documents: filenames.length,
          static: {
            documents: filenames.map((filename) => ({
              filename: path.resolve(filename),
              mime_type: mimeType,
              contents: fs.readFileSync(path.resolve(filename)).toString('base64'),
            })),
          },
        },
      },
    };
    return this.requestJson(`/api/v1/corpora/${corpusId}/sources`, body);
  }
}
