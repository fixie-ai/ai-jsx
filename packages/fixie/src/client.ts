import type { Jsonifiable } from 'type-fest';

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
        'You must set the FIXIE_API_KEY environment variable. This can be found at: https://app.fixie.ai/profile'
      );
    }
    client.apiKey = apiKey;
    return client;
  }

  async request(path: string, body?: any): Promise<Jsonifiable> {
    let res;
    if (body) {
      body = JSON.stringify(body);
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

  async userInfo(): Promise<Jsonifiable> {
    return this.request('/api/user');
  }

  async listCorpora(): Promise<Jsonifiable> {
    return this.request('/api/v1/corpora');
  }

  async getCorpus(corpusId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}`);
  }

  async createCorpus(name?: string): Promise<Jsonifiable> {
    const body = {
      name,
      sources: [],
    };
    return this.request(`/api/v1/corpora`, body);
  }

  async queryCorpus(corpusId: string, query: string, pageSize?: number): Promise<Jsonifiable> {
    const body = {
      corpus_id: corpusId,
      query,
      page_size: pageSize,
    };
    return this.request(`/api/v1/corpora/${corpusId}:query`, body);
  }

  async listCorpusSources(corpusId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}/sources`);
  }

  async getCorpusSource(corpusId: string, sourceId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}/sources/${sourceId}`);
  }

  async addCorpusSource(corpusId: string, urlPattern: string): Promise<Jsonifiable> {
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

  async refreshCorpusSource(corpusId: string, sourceId: string): Promise<Jsonifiable> {
    const body = {
      corpus_id: corpusId,
      source_id: sourceId,
    };
    return this.request(`/api/v1/corpora/${corpusId}/sources/${sourceId}:refresh`, body);
  }

  async listCorpusSourceJobs(corpusId: string, sourceId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}/sources/${sourceId}/jobs`);
  }

  async getCorpusSourceJob(corpusId: string, sourceId: string, jobId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}/sources/${sourceId}/jobs/${jobId}`);
  }

  async listCorpusDocs(corpusId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}/documents`);
  }

  async getCorpusDoc(corpusId: string, docId: string): Promise<Jsonifiable> {
    return this.request(`/api/v1/corpora/${corpusId}/documents/${docId}`);
  }
}
