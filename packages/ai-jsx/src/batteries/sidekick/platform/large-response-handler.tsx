import * as AI from '../../../index.js';
import { ConversationMessage, FunctionResponse } from '../../../core/conversation.js';

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { getEncoding } from 'js-tiktoken';
import yaml from 'js-yaml';
import _ from 'lodash';
import { UseToolsProps } from '../../use-tools.js';
import { cohereContext, MarkdownChunkFormatter, RerankerFormatted } from '../../../lib/cohere.js';

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
    children: AI.Node;
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
    maxLength = 4000,
    numChunks = 4,
    // use Cohere token counter?
    lengthFunction = openAITokenCount,
    ...props
  }: AI.PropsOfComponent<typeof FunctionResponse> & {
    maxLength?: number;
    numChunks?: number;
    lengthFunction?: LengthFunction;
  },
  { render, logger, getContext }: AI.ComponentContext
) {
  if (props.failed) {
    return (
      // TODO: fix issue between maxLength chars and tokens
      <FunctionResponse {...props}>
        <TruncateByChars maxLength={maxLength}>{children}</TruncateByChars>
      </FunctionResponse>
    );
  }

  let stringified = await render(children);

  // Option 1: do nothing if it's already small enough
  if ((await lengthFunction(stringified)) <= maxLength) {
    return <FunctionResponse {...props}>{stringified}</FunctionResponse>;
  }

  stringified = yamlOptimizeIfPossible(stringified);

  // Option 2: try dumping as YAML, if it's small enough then we are done
  if ((await lengthFunction(stringified)) <= maxLength) {
    return <FunctionResponse {...props}>{stringified}</FunctionResponse>;
  }

  // Option 3 (last reosrt): split into chunks and allow LLM to query by similarity
  // Requires Cohere API key for doing similarity search
  const cohereConfig = getContext(cohereContext);

  if (!cohereConfig.api_key) {
    // Not yet an error, but this is an error just waiting to happen
    logger.warn(
      { CohereContext: cohereConfig },
      'FunctionResponse is too big, but Cohere API key is not set. Please set it in the context.'
    );
  }

  const splitter = new RecursiveCharacterTextSplitter({
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
      func: ({ query }) => (
        <RerankerFormatted
          query={query}
          documents={responseContent.chunks}
          top_n={2}
          Formatter={MarkdownChunkFormatter}
        />
      ),
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
