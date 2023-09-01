import type { Jsonifiable } from 'type-fest';
import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import createUploadLink from 'apollo-upload-client/public/createUploadLink.js';

export interface UserInfo {
  id: number;
  username: string;
  is_authenticated: boolean;
  is_superuser: boolean;
  is_staff: boolean;
  is_active: boolean;
  is_anonymous: boolean;
  email?: string;
  first_name?: string;
  last_name?: string;
  last_login?: Date;
  date_joined?: Date;
  api_token?: string;
  avatar?: string;
  organization?: string;
}

/**
 * A client to the Fixie AI platform.
 */
export class FixieClient {
  url!: string;
  apiKey!: string;

  /** Use Create() instead. */
  private constructor() {}

  /**
   * Create a new Fixie client.
   * @param url The URL of the Fixie API server.
   */
  public static Create(url: string): FixieClient {
    const client = new FixieClient();
    client.url = url;
    const apiKey = process.env.FIXIE_API_KEY;
    if (!apiKey) {
      throw new Error(
        'You must set the FIXIE_API_KEY environment variable. This can be found at: https://beta.fixie.ai/profile'
      );
    }
    client.apiKey = apiKey;
    return client;
  }

  async request(path: string, bodyData?: any): Promise<Jsonifiable> {
    let res;
    if (bodyData) {
      const body = JSON.stringify(bodyData);
      res = await fetch(`${this.url}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body,
      });
    } else {
      res = await fetch(`${this.url}${path}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
    }
    if (!res.ok) {
      throw new Error(`Failed to access Fixie API ${this.url}${path}: ${res.statusText}`);
    }
    return res.json();
  }

  gqlClient(): ApolloClient<any> {
    return new ApolloClient({
      cache: new InMemoryCache(),
      link: createUploadLink({
        uri: `${this.url}/graphql`,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }),
    });
  }

  userInfo(): Promise<UserInfo> {
    const rawUserInfo: unknown = this.request('/api/user');
    return rawUserInfo as Promise<UserInfo>;
  }

  listCorpora(): Promise<Jsonifiable> {
    return this.request('/api/v1/corpora');
  }

  getCorpus(corpusId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}`);
  }

  createCorpus(name?: string): Promise<Jsonifiable> {
    const body = {
      name,
      sources: [],
    };
    return this.request('/api/v1/corpora', body);
  }

  queryCorpus(corpusId: string, query: string, pageSize?: number): Promise<Jsonifiable> {
    const body = {
      corpus_id: corpusId,
      query,
      page_size: pageSize,
    };
    return this.request(`/api/v1/corpora/${corpusId}:query`, body);
  }

  listCorpusSources(corpusId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}/sources`);
  }

  getCorpusSource(corpusId: string, sourceId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}/sources/${sourceId}`);
  }

  addCorpusSource(corpusId: string, urlPattern: string): Promise<Jsonifiable> {
    const body = {
      corpus_id: corpusId,
      source: {
        corpus_id: corpusId,
        load_spec: { web: { start_urls: [urlPattern] } },
        process_steps: [
          {
            name: 'markdownify',
            relevant_document_types: {
              include: { mime_types: ['text/html'] },
            },
            html_to_markdown: {},
          },
        ],
        embed_specs: [
          {
            name: 'markdown',
            relevant_document_types: {
              include: { mime_types: ['text/markdown'] },
            },
            max_chunk_size: 1000,
            chunk_overlap: 100,
            splits: ['\n\n', '\n', ' ', ''],
          },
          {
            name: 'plain',
            relevant_document_types: {
              include: { mime_types: ['text/plain'] },
            },
            max_chunk_size: 1000,
            chunk_overlap: 100,
            splits: ['\n\n', '\n', ' ', ''],
          },
        ],
      },
    };

    return this.request(`/api/v1/corpora/${corpusId}/sources`, body);
  }

  refreshCorpusSource(corpusId: string, sourceId: string): Promise<Jsonifiable> {
    const body = {
      corpus_id: corpusId,
      source_id: sourceId,
    };
    return this.request(`/api/v1/corpora/${corpusId}/sources/${sourceId}:refresh`, body);
  }

  listCorpusSourceJobs(corpusId: string, sourceId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}/sources/${sourceId}/jobs`);
  }

  getCorpusSourceJob(corpusId: string, sourceId: string, jobId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}/sources/${sourceId}/jobs/${jobId}`);
  }

  listCorpusDocs(corpusId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}/documents`);
  }

  getCorpusDoc(corpusId: string, docId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}/documents/${docId}`);
  }
}
