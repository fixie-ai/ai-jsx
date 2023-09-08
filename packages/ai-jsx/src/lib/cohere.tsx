import * as AI from '../index.js';
import { getEnvVar } from './util.js';

/**
 * Properties for a {@link cohereContext} that configure the Cohere API.
 */
export interface CohereProps {
  api_url?: string;
  api_key?: string;

  /**
   * Model to be used for reranking.
   *
   * @see https://docs.cohere.com/docs/reranking#parameters
   */
  reranker_model_name?: string;
}

export const DEFAULT_COHERE_CONFIGURATION = {
  reranker_model_name: 'rerank-multilingual-v2.0',
  api_url: 'https://api.cohere.ai/v1',
  api_key: getEnvVar('COHERE_API_KEY', false),
};

/**
 * Allows for configuring Cohere API
 * Uses COHERE_API_KEY environment variable and the multilingual model by default
 *
 * Currently only used by {@link reranker}.
 */
export const cohereContext = AI.createContext<CohereProps>(DEFAULT_COHERE_CONFIGURATION);

/**
 * Reranker from Cohere
 * Givne a query and a list of documents, returns the top_n documents sorted by relevance
 *
 * @see https://docs.cohere.com/docs/reranking
 *
 * @returns An array of objects with the index of the document and its relevance score
 */
export async function reranker(
  {
    query,
    documents,
    top_n,
    model,
  }: {
    query: string;
    documents: string[];
    top_n: number;
    model?: string;
  },
  { getContext, logger }: Pick<AI.ComponentContext, 'getContext' | 'logger'>
): Promise<{ index: number; relevance_score: number }[]> {
  const ctx = getContext(cohereContext);
  if (!ctx.api_key) {
    logger.error(
      { CohereContext: ctx },
      'Cohere API key is not set, but it is needed for doing reranking (e.g. loadBySimilarity).' +
        ' Please set it in the context.'
    );
    // fallback to original order
    // TODO: maybe try OpenAI too?
    return [...Array(Math.min(documents.length, top_n)).keys()].map((index) => ({ index, relevance_score: 0 }));
  }
  const response = await fetch(`${ctx.api_url}/rerank`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ctx.api_key}`,
    },
    body: JSON.stringify({
      query,
      documents,
      model: model ?? ctx.reranker_model_name ?? 'rerank-multilingual-v2.0',
      top_n,
    }),
  });

  logger.info({ response }, 'Got response from reranker server');

  if (response.status != 200) {
    throw new Error(`Reranker responded with error${await response.text()}`);
  }
  return (await response.json()).results;
}
