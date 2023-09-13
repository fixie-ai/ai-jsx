import * as AI from '../index.js';
import { AIJSXError, ErrorCode } from '../core/errors.js';
import { getEnvVar } from './util.js';

import { Jsonifiable } from 'type-fest';
import { get } from 'lodash';

/**
 * Properties for a {@link cohereContext} that configure the Cohere API.
 */
export type CohereProps = Jsonifiable & {
  api_url?: string;
  api_key?: string;

  /**
   * Model to be used for reranking.
   *
   * @see https://docs.cohere.com/docs/reranking#parameters
   */
  reranker_model_name?: string;
};

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

export interface RerankerProps {
  query: string;
  documents: string[];
  top_n: number;
}

/**
 * Reranker from Cohere
 * Given a query and a list of documents, returns the top_n documents sorted by relevance
 *
 * @see https://docs.cohere.com/docs/reranking
 *
 * @returns An array of objects with the index of the document and its relevance score
 */
export async function cohereReranker(
  { query, documents, top_n }: RerankerProps,
  cohereConfig: CohereProps,
  logger?: AI.ComponentContext['logger']
): Promise<{ index: number; relevance_score: number }[]> {
  if (!cohereConfig.api_key) {
    throw new AIJSXError(
      'Cohere API key is not set, but it is needed for doing reranking (e.g. loadBySimilarity).' +
        ' Please set it in the context.',
      ErrorCode.MissingRerankerModel,
      'user',
      { cohereConfig }
    );
  }

  const response = await fetch(`${cohereConfig.api_url}/rerank`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cohereConfig.api_key}`,
    },
    body: JSON.stringify({
      query,
      documents,
      model: cohereConfig.reranker_model_name ?? 'rerank-multilingual-v2.0',
      top_n,
    }),
  });

  if (logger) {
    logger.info({ response }, 'Got response from reranker server');
  }

  if (response.status != 200) {
    throw new AIJSXError('Cohere reranker API Error', ErrorCode.CohereAPIError, 'ambiguous', {
      status: response.status,
      body: await response.text(),
    });
  }

  return (await response.json()).results;
}

/**
 * A helper function that uses the Cohere API to rerank documents.
 * Since {@link reranker} output is a list of indices, it cannot be used as an {@link AI.Component} directly.
 * This function takes care of that by formatting the output.
 *
 * @example
 * ```tsx
 *   <RerankerFormatted
 *    query={query}
 *    documents={documents}
 *    top_n={top_n}
 *    Formatter={MarkdownChunkFormatter}
 *   />
 * ```
 */
export async function RerankerFormatted(
  {
    Formatter,
    splitter = '\n\n',
    ...rerankerProps
  }: RerankerProps & {
    Formatter: AI.Component<{ children: string }>;
    splitter?: string;
  },
  { getContext, logger }: AI.ComponentContext
) {
  const response = await cohereReranker(rerankerProps, getContext(cohereContext), logger);

  return (
    <>
      {response.map((chunk, i) => (
        <>
          {i != 0 ? splitter : null}
          <Formatter>{rerankerProps.documents[chunk.index]}</Formatter>
        </>
      ))}
    </>
  );
}

/**
 * A very basic formatter for chunks.
 * It wraps the chunk text in a Markdown code block and escapes any Markdown code blocks in the chunk text.
 */
export function MarkdownChunkFormatter({ children }: { children: string }) {
  return (
    <>
      {'```chunk\n'}
      {children.replaceAll('```', '\\`\\`\\`')}
      {'\n```'}
    </>
  );
}
