import { AssistantMessage, ChatProvider, CompletionProvider, FunctionCall, FunctionResponse, ModelProps, ModelPropsWithChildren, SystemMessage, UserMessage } from '../core/completion.js';
import { ErrorCode } from '../core/errors.js';
import * as AI from '../index.js';
import { getPolyfilledMessages } from './anthropic.js';
import { Node } from '../index.js';
import Replicate from 'replicate';
import { getEnvVar } from './util.js';

export interface Llama2ModelProps extends ModelProps {
  /** Penalty for repeated words in the output. Must be in the range [0.01, 5]. */
  repetitionPenalty?: number;
}

/**
 * Arguments to the Llama2 model.
 *
 * @see https://replicate.com/replicate/llama70b-v2-chat
 */
export interface FetchLlama2Args extends Pick<ModelProps, 'temperature'> {
  prompt: string;
  /** The maximum number of tokens to generate */
  max_length?: number;
  /** Penalty for repeated words in the output. Must be in the range [0.01, 5]. */
  repetition_penalty?: Llama2ModelProps['repetitionPenalty'];

  top_p: ModelProps['topP'];

  modelType: 'chat' | 'completion';
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
export type FetchLlama2 = (args: FetchLlama2Args) => AsyncGenerator<string, string>;

export interface Llama2Props extends ModelPropsWithChildren, Pick<Llama2ModelProps, 'repetitionPenalty'> {
  fetch: FetchLlama2;
}

export interface Llama2ChatProps extends Llama2Props {
  getArgsOfChildren(children: Node): Pick<FetchLlama2Args>;
}

/**
 * If you use a Llama2 model without specifying the max tokens for the completion, this value will be used as the default.
 */
export const defaultMaxTokens = 500;

/**
 * This will polyfill a chat model call for Llama2. However, note that Llama2 is not a structured chat model
 * in the same way GPT-4 is. You may be better off thinking about Llama2 as a traditional completion model.
 * And as such, you may wish to use `<Completion>` instead of `<ChatCompletion>`, for finer-grained control.
 *
 * The key difference between Chat and Completion models is that Chat models are structured as a conversation
 * between a user and an assistant, whereas Completion models are just trying to predict subsequent text. So
 * if you give a Completion model a prompt like:
 *
 *    Human: Hi, how are you?
 *    Assistant: I'm doing well, how are you?
 *    Human: I'm good. What is your name?
 *
 * You may get a completion like:
 *    Assistant: Sam. What's yours?
 *    Human: Chris.
 *
 * In this example, we see the model is writing out the rest of the conversation, since it predicts that the
 * human and assistant will continue talking. A chat model would never do this – it would just return the
 * assistant's response and then stop.
 *
 * You may have to do a little more prompt engineering work to get the model in the mood to chat and stop
 * responding after a single message.
 */
async function* Llama2ChatModel(props: Llama2ChatProps, { render, logger }: AI.ComponentContext): AI.RenderableStream {
  yield AI.AppendOnlyStream;
  const messageElements = (await render(props.children, {
    stop: (e) =>
      e.tag == SystemMessage ||
      e.tag == UserMessage ||
      e.tag == AssistantMessage ||
      e.tag == FunctionCall ||
      e.tag == FunctionResponse,
  }));

  const systemMessage = messageElements.find((e) => e.tag == SystemMessage);
  const userMessages = messageElements.filter((e) => e.tag == UserMessage);
  if (userMessages.length > 1) {
    throw new AIJSXError(
      'Replicate Llama2 does not support multiple user messages. Please use a single <UserMessage>.',
      ErrorCode.Llama2DoesNotSupportMultipleUserMessages
    );
  }

  yield AI.AppendOnlyStream;
  const llama2Args: FetchLlama2Args = {
    modelType: 'chat',
    max_length: props.maxTokens ?? defaultMaxTokens,
    repetition_penalty: props.repetitionPenalty,
    temperature: props.temperature,
    top_p: props.topP,
    ...props.getArgsOfChildren(props.children),
  };
  logger.debug({ llama2Args }, 'Calling Llama2');
  const response = await props.fetch(llama2Args);
  yield* response;
  return AI.AppendOnlyStream;
}

async function* Llama2CompletionModel(
  props: Llama2Props,
  { render, logger }: AI.ComponentContext
): AI.RenderableStream {
  yield AI.AppendOnlyStream;
  const prompt = await render(props.children);
  const llama2Args: FetchLlama2Args = {
    modelType: 'completion',
    prompt,
    max_length: props.maxTokens ?? defaultMaxTokens,
    temperature: props.temperature,
    top_p: props.topP,
  };
  logger.debug({ llama2Args }, 'Calling Llama2');
  const response = await props.fetch(llama2Args);
  yield* response;
  return AI.AppendOnlyStream;
}

/**
 * This component causes all children `ChatCompletion` and `Completion` components to use Llama2.
 *
 * Because Llama2 is open source, there's no single model provider like there is for OpenAI and Anthropic.
 * If you're using this component, you probably have your own Llama2 instance hosted somewhere.
 * To point this component to your Llama2 instance, pass a `fetchLlama2` function that returns a generator that yields chunks of the response.
 *
 * @see ReplicateLlama2 if you have a model hosted on Replicate.
 * @see Llama2ChatModel for notes about polyfilling.
 */
export function Llama2({
  children,
  fetchLlama2,
  ...defaults
}: { children: Node; fetchLlama2: FetchLlama2 } & Llama2ModelProps) {
  return (
    <ChatProvider component={Llama2ChatModel} {...defaults} fetch={fetchLlama2}>
      <CompletionProvider component={Llama2CompletionModel} {...defaults} fetch={fetchLlama2}>
        {children}
      </CompletionProvider>
    </ChatProvider>
  );
}

/**
 * This component causes all children `ChatCompletion` and `Completion` components to use Llama2 hosted on Replicate.
 *
 * You must set env var REPLICATE_API_TOKEN or REACT_REPLICATE_API_TOKEN for this to work.
 *
 * Drawbacks to this implementation:
 *  * The Replicate JS client lib does not support streaming.
 *  * The Replicate API will sometimes return an empty string with no explanation.
 *      (This has been observed when passing maxTokens=50.)
 */
export function ReplicateLlama2(
  { children, ...defaults }: { children: Node } & Llama2ModelProps,
  { logger }: AI.ComponentContext
) {
  const replicate = new Replicate({
    auth: getEnvVar('REPLICATE_API_TOKEN', true)!,
  });

  async function* fetchLlama2(input: FetchLlama2Args) {
    const modelId = input.modelType === 'chat' ? 'replicate/llama70b-v2-chat:2d19859030ff705a87c746f7e96eea03aefb71f166725aee39692f1476566d48' : 'replicate/llama70b-v2-chat:e951f18578850b652510200860fc4ea62b3b16fac280f83ff32282f87bbd2e48';
    const output = (await replicate.run(
      modelId,
      { input }
    )) as string[];
    const result = output.join('');
    logger.debug({ output, result }, 'Replicate output');
    yield result;
    return result;
  }

  return (
    <Llama2 {...defaults} fetchLlama2={fetchLlama2}>
      {children}
    </Llama2>
  );
}
