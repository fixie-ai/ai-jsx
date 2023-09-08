import * as AI from '../../../index.js';
import { ConversationMessage, FunctionResponse } from '../../../core/conversation.js';

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { getEncoding } from 'js-tiktoken';
import yaml from 'js-yaml';
import _ from 'lodash';
import { UseToolsProps } from '../../use-tools.js';
import { getEnvVar } from '../../../lib/util.js';

export type LengthFunction = ((text: string) => number) | ((text: string) => Promise<number>);
export interface RedactedFuncionResponseMetadata {
  isRedacted: true;
  chunks: string[];
}

const getEncoder = _.once(() => getEncoding('cl100k_base'));

function openAITokenCount(text: string) {
  return getEncoder().encode(text).length;
}

export async function TruncateByChars(
  {
    children,
    maxLength,
  }: {
    children: string;
    maxLength: number;
  },
  { render }: AI.ComponentContext
) {
  const stringified = await render(children);
  if (stringified.length <= maxLength) {
    return stringified;
  }
  return `${stringified.slice(0, maxLength - 3)}...`;
}

export async function LargeFunctionResponseHandler(
  {
    children,
    maxLength,
    numChunks = 4,
    // use Cohere token counter?
    lengthFunction = openAITokenCount,
    ...props
  }: AI.PropsOfComponent<typeof FunctionResponse> & {
    maxLength: number;
    numChunks?: number;
    lengthFunction?: LengthFunction;
  },
  { render }: AI.ComponentContext
) {
  let stringified = await render(children);

  console.log('typeof stringified: ', typeof stringified);

  // if (typeof stringified !== 'string') {
  //   stringified = JSON.stringify(stringified);
  // }

  // Option 1: do nothing if it's already small enough
  if ((await lengthFunction(stringified)) <= maxLength) {
    return <FunctionResponse {...props}>{stringified}</FunctionResponse>;
  }

  stringified = yamlOptimizeIfPossible(stringified);

  // Option 2: try dumping as YAML, if it's small enough then we are done
  if ((await lengthFunction(stringified)) <= maxLength) {
    return <FunctionResponse {...props}>{stringified}</FunctionResponse>;
  }

  // TODO: only split if reranker is available
  // Option 3 (last reosrt): split into chunks and allow LLM to query by similarity
  const splitter = new RecursiveCharacterTextSplitter({
    // TODO: replace magic numbers (4, 4000, etc)
    chunkSize: maxLength / numChunks,
    chunkOverlap: maxLength / numChunks / 10,
    lengthFunction,
  });
  const chunks = await splitter.splitText(stringified);

  return (
    <FunctionResponse {...props} metadata={{ isRedacted: true, chunks }}>
      ... The response is too big and hence redacted. The response can be queried using semantic similarity search by
      calling the `loadBySimilarity` function.
    </FunctionResponse>
  );
  // TODO: return a chunk based on query (gotta get it from conversation)
}

function getLastRedactedFnResponseData(messages: ConversationMessage[]): RedactedFuncionResponseMetadata | undefined {
  let lastFnResData = undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (
      msg.type == 'functionResponse' &&
      typeof msg.element.props.metadata !== 'undefined' &&
      'isRedacted' in msg.element.props.metadata &&
      Boolean(msg.element.props.metadata.isRedacted) &&
      'chunks' in msg.element.props.metadata &&
      Array.isArray(msg.element.props.metadata.chunks) &&
      msg.element.props.metadata.chunks.every((chunk) => typeof chunk === 'string')
    ) {
      lastFnResData = msg.element.props.metadata as unknown as RedactedFuncionResponseMetadata;
    }
  }
  if (lastFnResData === undefined) {
    return undefined;
  }
  return lastFnResData;
}

export function redactedFunctionTools(messages: ConversationMessage[]): UseToolsProps['tools'] {
  const responseContent = getLastRedactedFnResponseData(messages);
  if (!responseContent) {
    return {};
  }
  return {
    loadBySimilarity: {
      description: 'Query the response by using semantic similarity search.',
      parameters: {
        query: {
          type: 'string',
          description: 'A query string.',
          required: true,
        },
      },
      func: async ({ query }) => {
        console.log(`calling loadBySimilarity with ${query}`);
        const response = await reranker({
          query,
          documents: responseContent.chunks,
          top_n: 2,
        });
        return response
          .map(
            (chunk) => `
\`\`\`chunk
${responseContent.chunks[chunk.index].replaceAll('```', '\\`\\`\\`')}
\`\`\`
`
          )
          .join('\n');
      },
    },
  };
}

/**
 * YAML is more token-efficient than JSON, hence we try to convert to YAML if possible.
 * Note that minifiying JSON might reduce tokens, but it is also more confusing for LLMs.
 * To get the best of both worlds, we use YAML with a large line width and a max flow level.
 * This means that after a certain nesting level, YAML switches to inline format.
 *
 * Here is a comparison for a large test object:
 *  - JSON multi-line # tokens: 36175
 *  - JSON minified # tokens: 15006
 *  - YAML # tokens: 14546
 *  - YAML # tokens flowLevel=4: 13833
 *
 * Also see the following for more comparisons:
 *     [Internal] https://www.notion.so/fixieai/API-Response-Token-Limiting-2ba2a63b047044599370c2f26fcf2bfa
 *     [Public] https://nikas.praninskas.com/ai/2023/04/05/efficient-gpt-data-formats/
 *     [Public] https://betterprogramming.pub/yaml-vs-json-which-is-more-efficient-for-language-models-5bc11dd0f6df
 *
 * @param possiblyObjectText The text to optimize (in JSON/YAML format)
 * @returns Optimized text if possible, otherwise the original text
 */
function yamlOptimizeIfPossible(possiblyObjectText: string) {
  let content: any;
  try {
    content = JSON.parse(possiblyObjectText);
  } catch (e) {
    try {
      content = yaml.load(possiblyObjectText);
    } catch (e) {
      return possiblyObjectText;
    }
  }
  return yaml.dump(content, { lineWidth: 200, flowLevel: 4 });
}

interface RerankerResponse {
  results: { index: number; relevance_score: number }[];
}

async function reranker({
  query,
  documents,
  top_n,
  model = 'rerank-multilingual-v2.0',
  api_url = 'https://api.cohere.ai/v1', // to point to FIXIE: 'https://farzad-cohere-reranker-proxy-pgaenaxiea-uc.a.run.app/api/cohere-proxy/v1',
  api_key = getEnvVar('COHERE_API_KEY'), // to point to FIXIE AGENT_KEY
}: {
  query: string;
  documents: string[];
  top_n: number;
  model?: string;
  api_url?: string;
  api_key?: string;
}): Promise<RerankerResponse['results']> {
  const response = await fetch(`${api_url}/rerank`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${api_key}`,
    },
    body: JSON.stringify({
      query,
      documents,
      model,
      top_n,
    }),
  });

  if (response.status != 200) {
    throw new Error(await response.text());
  }
  return (await response.json()).results as RerankerResponse['results'];
}
