import type { Jsonifiable } from 'type-fest';

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
 *
 * This client can be used on the web or in NodeJS
 */
export class IsomorphicFixieClient {
  /**
   * Use the `Create*` methods instead.
   */
  protected constructor(public readonly url: string, protected readonly apiKey?: string) {}

  static Create(url: string, apiKey?: string) {
    const apiKeyToUse = apiKey ?? process.env.FIXIE_API_KEY;
    if (!apiKeyToUse) {
      throw new Error(
        'You must pass apiKey to the constructor, or set the FIXIE_API_KEY environment variable. The API key can be found at: https://console.fixie.ai/profile'
      );
    }
    return new this(url, apiKey);
  }

  /**
   * Create a new FixieClient without an API key. You probably don't want this. This is only useful if you're running
   * code in the browser on the same domain as the Fixie service; e.g. app.fixie.ai.
   */
  static CreateWithoutApiKey(url: string) {
    return new this(url);
  }

  /** Send a request to the Fixie API with the appropriate auth headers. */
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

  /** Return information on the currently logged-in user. */
  userInfo(): Promise<UserInfo> {
    const rawUserInfo: unknown = this.request('/api/user');
    return rawUserInfo as Promise<UserInfo>;
  }

  /** List Corpora visible to this user. */
  listCorpora(): Promise<Jsonifiable> {
    return this.request('/api/v1/corpora');
  }

  /** Get information about a given Corpus. */
  getCorpus(corpusId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}`);
  }

  /** Create a new Corpus. */
  createCorpus(name?: string, description?: string): Promise<Jsonifiable> {
    const body = {
      corpus: {
        display_name: name,
        description,
      },
    };
    return this.request('/api/v1/corpora', body);
  }

  /** Query a given Corpus. */
  queryCorpus(corpusId: string, query: string, maxChunks?: number): Promise<Jsonifiable> {
    const body = {
      corpus_id: corpusId,
      query,
      max_chunks: maxChunks,
    };
    return this.request(`/api/v1/corpora/${corpusId}:query`, body);
  }

  /** List the Sources in a given Corpus. */
  listCorpusSources(corpusId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}/sources`);
  }

  /** Get information about a given Source. */
  getCorpusSource(corpusId: string, sourceId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}/sources/${sourceId}`);
  }

  /** Add a new Source to a Corpus. */
  addCorpusSource(
    corpusId: string,
    startUrls: string[],
    maxDocuments?: number,
    maxDepth?: number
  ): Promise<Jsonifiable> {
    const body = {
      corpus_id: corpusId,
      source: {
        corpus_id: corpusId,
        load_spec: {
          max_documents: maxDocuments,
          web: {
            start_urls: startUrls,
            max_depth: maxDepth,
          },
        },
      },
    };

    return this.request(`/api/v1/corpora/${corpusId}/sources`, body);
  }

  /** Refresh the given Source. */
  refreshCorpusSource(corpusId: string, sourceId: string): Promise<Jsonifiable> {
    const body = {
      corpus_id: corpusId,
      source_id: sourceId,
    };
    return this.request(`/api/v1/corpora/${corpusId}/sources/${sourceId}:refresh`, body);
  }

  /** List Jobs associated with a given Source. */
  listCorpusSourceJobs(corpusId: string, sourceId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}/sources/${sourceId}/jobs`);
  }

  /** Get information about a given Job. */
  getCorpusSourceJob(corpusId: string, sourceId: string, jobId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}/sources/${sourceId}/jobs/${jobId}`);
  }

  /** List Documents in a given Corpus. */
  listCorpusDocs(corpusId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}/documents`);
  }

  /** Get information about a given Document. */
  getCorpusDoc(corpusId: string, docId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}/documents/${docId}`);
  }
}
