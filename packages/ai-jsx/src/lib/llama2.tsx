import { ModelProps, ModelPropsWithChildren } from '../core/completion.js';
import { ErrorCode } from '../core/errors.js';
import * as AI from '../index.js';
import { getPolyfilledMessages } from './anthropic.js';

/**
 * Arguments to the Llama2 model.
 * 
 * @see https://replicate.com/replicate/llama70b-v2-chat
 */
interface FetchLlama2Args extends Pick<ModelProps, 'temperature'> {
  prompt: string;
  /** The maximum number of tokens to generate */
  max_length?: number;
  /** Penalty for repeated words in the output. Must be in the range [0.01, 5]. */
  repetition_penalty?: number;

  top_p: ModelProps['topP'];
}

/** 
 * A fetcher function that points to your Llama2 endpoint.
 * 
 * It should return a generator that yields chunks of the response.
 * 
 * For example, if the model generates the string "hello world I am an AI", the generator might yield:
 *  - hel
 *  - lo world I a
 *  - m an AI
 * 
 * If you don't have a streaming API, you can just yield a single chunk.
 */
type FetchLlama2 = (args: FetchLlama2Args) => Promise<AsyncGenerator<string, void>>;

interface Llama2Props extends ModelPropsWithChildren {
  fetch: FetchLlama2;
}

/**
 * If you use a Llama2 model without specifying the max tokens for the completion, this value will be used as the default.
 */
export const defaultMaxTokens = 500;

async function* Llama2ChatModel(props: Llama2Props, {render, logger}: AI.ComponentContext) {
  const messages = await getPolyfilledMessages(props.children, render, 'Llama2', ErrorCode.Llama2DoesNotSupportFunctions);
  yield AI.AppendOnlyStream;
  const prompt = messages.join('\n\n');
  const llama2Args: FetchLlama2Args = {prompt, max_length: props.maxTokens ?? defaultMaxTokens, temperature: props.temperature, top_p: props.topP};
  logger.debug({llama2Args}, 'Calling Llama2');
  const response = await props.fetch(llama2Args);
  yield* response;
  return AI.AppendOnlyStream;
}

async function* Llama2CompletionModel(props: Llama2Props, {render, logger}: AI.ComponentContext) {
  yield AI.AppendOnlyStream;
  const prompt = await render(props.children);
  const llama2Args: FetchLlama2Args = {prompt, max_length: props.maxTokens ?? defaultMaxTokens, temperature: props.temperature, top_p: props.topP};
  logger.debug({llama2Args}, 'Calling Llama2');
  const response = await props.fetch(llama2Args);
  yield* response;
  return AI.AppendOnlyStream;
}