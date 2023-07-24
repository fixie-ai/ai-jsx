import { AssistantMessage, ChatProvider, CompletionProvider, FunctionCall, FunctionResponse, ModelProps, ModelPropsWithChildren, SystemMessage, UserMessage } from '../core/completion.js';
import { AIJSXError, ErrorCode } from '../core/errors.js';
import * as AI from '../index.js';
import Replicate from 'replicate';
import { getEnvVar } from './util.js';

async function* fetchLlama2<ModelArgs extends Llama2ModelArgs>(modelId: Parameters<Replicate['run']>[0], input: ModelArgs, logger: AI.ComponentContext['logger']) {
  const replicate = new Replicate({
    auth: getEnvVar('REPLICATE_API_TOKEN', true)!,
  });

  // const modelId = input.modelType === 'chat' ? '' : ;
  const output = (await replicate.run(
    modelId,
    { input }
  )) as string[];
  const result = output.join('');
  logger.debug({ output, result }, 'Replicate output');
  yield result;
  return result;
}

export interface Llama2ModelArgs extends Omit<Llama2ModelProps, 'repetitionPenalty' | 'children'> {
  prompt: string;
  /** Penalty for repeated words in the output. Must be in the range [0.01, 5]. */
  repetition_penalty?: Llama2ModelProps['repetitionPenalty'];
}

/**
 * Arguments to the Replicate Llama2 models.
 * 
 * @see https://replicate.com/replicate/llama70b-v2-chat
 * @see https://replicate.com/replicate/llama70b-v2
 */
export interface Llama2ModelProps extends ModelPropsWithChildren {
  /** Penalty for repeated words in the output. Must be in the range [0.01, 5]. */
  repetitionPenalty?: number;

  /** The maximum number of tokens to generate */
  max_length?: number;

  top_p: ModelProps['topP'];
}

export interface Llama2ChatModelArgs extends Llama2ModelArgs {
  system_prompt?: string;
}

/**
 * If you use a Llama2 model without specifying the max tokens for the completion, this value will be used as the default.
 */
export const defaultMaxTokens = 500;

export async function* Llama2ChatModel(props: Llama2ModelProps, { render, logger }: AI.ComponentContext): AI.RenderableStream {
  yield AI.AppendOnlyStream;
  const messageElements = (await render(props.children, {
    stop: (e) =>
      e.tag == SystemMessage ||
      e.tag == UserMessage ||
      e.tag == AssistantMessage ||
      e.tag == FunctionCall ||
      e.tag == FunctionResponse,
  })).filter(AI.isElement);

  const systemMessage = messageElements.find((e) => e.tag == SystemMessage);
  const userMessages = messageElements.filter((e) => e.tag == UserMessage);
  if (userMessages.length > 1) {
    throw new AIJSXError(
      'Replicate Llama2 does not support multiple user messages. Please use a single <UserMessage>.',
      ErrorCode.Llama2DoesNotSupportMultipleUserMessages,
      'user'
    );
  }
  if (messageElements.find(e => e.tag == AssistantMessage)) {
    throw new AIJSXError(
      'Replicate Llama2 does not support <AssistantMessage>. Please use <SystemMessage> instead.',
      ErrorCode.Llama2DoesNotSupportAssistantMessages,
      'user'
    );
  }
  if (messageElements.find(e => e.tag == FunctionCall)) {
    throw new AIJSXError(
      'Replicate Llama2 does not support <FunctionCall>. Please use <SystemMessage> instead.',
      ErrorCode.Llama2DoesNotSupportFunctionCalls,
      'user'
    );
  }
  if (messageElements.find(e => e.tag == FunctionResponse)) {
    throw new AIJSXError(
      'Replicate Llama2 does not support <FunctionResponse>. Please use <SystemMessage> instead.',
      ErrorCode.Llama2DoesNotSupportFunctionResponse,
      'user'
    );
  }

  yield AI.AppendOnlyStream;
  const llama2Args: Llama2ChatModelArgs = {
    max_length: props.maxTokens ?? defaultMaxTokens,
    repetition_penalty: props.repetitionPenalty,
    temperature: props.temperature,
    top_p: props.topP,
    prompt: await render(userMessages[0]),
    system_prompt: systemMessage ? await render(systemMessage) : undefined,
  };
  logger.debug({ llama2Args }, 'Calling Llama2');
  const response = await fetchLlama2('replicate/llama70b-v2-chat:2d19859030ff705a87c746f7e96eea03aefb71f166725aee39692f1476566d48', llama2Args, logger);
  yield* response;
  return AI.AppendOnlyStream;
}

export async function* Llama2CompletionModel(
  props: Llama2ModelProps,
  { render, logger }: AI.ComponentContext
): AI.RenderableStream {
  yield AI.AppendOnlyStream;
  const prompt = await render(props.children);
  const llama2Args: Llama2ModelArgs = {
    prompt,
    max_length: props.maxTokens ?? defaultMaxTokens,
    temperature: props.temperature,
    top_p: props.topP,
  };
  logger.debug({ llama2Args }, 'Calling Llama2');
  const response = await fetchLlama2('replicate/llama70b-v2-chat:e951f18578850b652510200860fc4ea62b3b16fac280f83ff32282f87bbd2e48', llama2Args, logger);
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
 * You must set env var REPLICATE_API_TOKEN or REACT_REPLICATE_API_TOKEN for this to work.
 *
 * Drawbacks to this implementation:
 *  * The Replicate JS client lib does not support streaming.
 *  * The Replicate API will sometimes return an empty string with no explanation.
 *      (This has been observed when passing maxTokens=50.)
 */
export function ReplicateLlama2({
  children,
  ...defaults
}: Llama2ModelProps) {
  return (
    <ChatProvider component={Llama2ChatModel} {...defaults}>
      <CompletionProvider component={Llama2CompletionModel} {...defaults}>
        {children}
      </CompletionProvider>
    </ChatProvider>
  );
}
