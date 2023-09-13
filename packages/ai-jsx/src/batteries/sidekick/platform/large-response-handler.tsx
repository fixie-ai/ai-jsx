import * as AI from '../../../index.js';
import { ConversationMessage, FunctionResponse, FunctionResponseProps } from '../../../core/conversation.js';

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { getEncoding } from 'js-tiktoken';
import yaml from 'js-yaml';
import _ from 'lodash';
import { UseToolsProps } from '../../use-tools.js';
import { cohereContext, MarkdownChunkFormatter, RerankerFormatted } from '../../../lib/cohere.js';
import { Jsonifiable } from 'type-fest';

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

export interface LargeFunctionResponseProps {
  maxLength: number;
  failedMaxLength: number;
  numChunks: number;
  lengthFunction?: LengthFunction;
}

async function LargeFunctionResponseHandler(
  {
    children,
    maxLength = 4000,
    failedMaxLength = 1000,
    numChunks = 4,
    // use Cohere token counter?
    lengthFunction = openAITokenCount,
    ...props
  }: AI.PropsOfComponent<typeof FunctionResponse> & LargeFunctionResponseProps,
  { render, logger, getContext }: AI.ComponentContext
) {
  if (props.failed) {
    return (
      // TODO: fix issue between maxLength chars and tokens
      <FunctionResponse {...props}>
        <TruncateByChars maxLength={failedMaxLength}>{children}</TruncateByChars>
      </FunctionResponse>
    );
  }

  let stringified = await render(children);

  // Option 1: do nothing if it's already small enough
  if ((await lengthFunction(stringified)) <= maxLength) {
    return <FunctionResponse {...props}>{stringified}</FunctionResponse>;
  }

  stringified = yamlOptimizeIfPossible(stringified);

  // Option 2: try dumping as YAML. If it's small enough, then we are done.
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

/**
 * This function allows wrapping {@link FunctionResponse} elements that can possibly be too large.
 * It will replace FunctionResponse elements with {@link LargeFunctionResponseHandler}s that know how to handle large responses.
 *
 * {@link LargeFunctionResponseHandler} will not modify responses that are not large. If they are, it will first try
 * to optimize the response by dumping it as YAML, which is more token-efficient than JSON.
 * If that doesn't work, it will split the response into chunks and allows the LLM to query it using semantic similarity
 * search by exposing a dynamic function called `loadBySimilarity(query)`.
 *
 * Note that failed responses are not optimized and will simply be truncated to `failedMaxLength` characters.
 *
 * @see {@link redactedFunctionTools} to see how to add the `loadBySimilarity` function.
 *
 * @example
 * ```tsx
 *    <LargeFunctionResponseWrapper maxLength={4000} failedMaxLength={1000} numChunks={4}>
 *      <ExecuteFunction func={tool[name].func} name={name} args={args} />
 *    </LargeFunctionResponseWrapper>
 * ```
 */
export async function LargeFunctionResponseWrapper(
  { children, ...props }: { children: AI.Node } & LargeFunctionResponseProps,
  { render }: AI.ComponentContext
) {
  // We need to render the children to get the FunctionResponse elements
  const elements = await render(children, { stop: (e) => e.tag == FunctionResponse });

  // We expect elements to just contain a single FunctionResponse but we handle multiple just in case
  return elements.map((element) =>
    AI.isElement(element) && element.tag == FunctionResponse ? (
      <LargeFunctionResponseHandler {...props} {...(element.props as FunctionResponseProps)} />
    ) : (
      element
    )
  );
}

function getLastRedactedFnResponseData(messages: ConversationMessage[]): RedactedFuncionResponseMetadata | undefined {
  return _.findLast(
    messages,
    (msg) =>
      msg.type == 'functionResponse' &&
      typeof msg.element.props.metadata !== 'undefined' &&
      'isRedacted' in msg.element.props.metadata &&
      Boolean(msg.element.props.metadata.isRedacted) &&
      'chunks' in msg.element.props.metadata &&
      Array.isArray(msg.element.props.metadata.chunks) &&
      msg.element.props.metadata.chunks.every((chunk) => typeof chunk === 'string')
  ) as RedactedFuncionResponseMetadata | undefined;
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
  let content: Jsonifiable;
  try {
    content = JSON.parse(possiblyObjectText);
  } catch (e) {
    try {
      content = yaml.load(possiblyObjectText) as Jsonifiable;
    } catch (e) {
      return possiblyObjectText;
    }
  }
  return yaml.dump(content, { lineWidth: 200, flowLevel: 4 });
}
