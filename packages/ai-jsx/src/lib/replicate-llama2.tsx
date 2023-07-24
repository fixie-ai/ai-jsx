import {
  AssistantMessage,
  ChatProvider,
  CompletionProvider,
  FunctionCall,
  FunctionResponse,
  ModelPropsWithChildren,
  SystemMessage,
  UserMessage,
} from '../core/completion.js';
import { AIJSXError, ErrorCode } from '../core/errors.js';
import * as AI from '../index.js';
import Replicate from 'replicate';
import { getEnvVar } from './util.js';

/**
 * Run a Llama2 model on Replicate.
 */
async function* fetchLlama2<ModelArgs extends Llama2ModelArgs>(
  modelId: Parameters<Replicate['run']>[0],
  input: ModelArgs,
  logger: AI.ComponentContext['logger']
) {
  const replicate = new Replicate({
    auth: getEnvVar('REPLICATE_API_TOKEN', true)!,
  });

  logger.debug({ modelId, input }, 'Calling Replicate llama2');

  // const modelId = input.modelType === 'chat' ? '' : ;
  const output = (await replicate.run(modelId, { input })) as string[];
  const result = output.join('');
  logger.debug({ output, result }, 'Replicate llama2 output');
  yield result;
  return result;
}

/**
 * Arguments to the Replicate Llama2 API.
 *
 * @see https://replicate.com/replicate/llama70b-v2-chat
 * @see https://replicate.com/replicate/llama70b-v2
 */
export interface Llama2ModelArgs extends Omit<Llama2ModelProps, 'repetitionPenalty' | 'children'> {
  prompt: string;
  /** Penalty for repeated words in the output. Must be in the range [0.01, 5]. */
  repetition_penalty?: Llama2ModelProps['repetitionPenalty'];

  top_p?: Llama2ModelProps['topP'];

  /** The maximum number of tokens to generate */
  max_length?: Llama2ModelProps['maxTokens'];
}

/**
 * Props for the Replicate Llama2 completion component.
 *
 * @see https://replicate.com/replicate/llama70b-v2
 */
export interface Llama2ModelProps extends ModelPropsWithChildren {
  /** Penalty for repeated words in the output. Must be in the range [0.01, 5]. */
  repetitionPenalty?: number;
}

/**
 * Props for the Replicate Llama2 chat completion component.
 *
 * @see https://replicate.com/replicate/llama70b-v2-chat
 */
export interface Llama2ChatModelArgs extends Llama2ModelArgs {
  system_prompt?: string;
}

/**
 * If you use a Llama2 model without specifying the max tokens for the completion, this value will be used as the default.
 */
export const defaultMaxTokens = 500;

/**
 * Don't use this directly. Instead, wrap your `<ChatCompletion>` element in `<ReplicateLlama2>`.
 *
 * @hidden
 */
export async function* Llama2ChatModel(
  props: Llama2ModelProps,
  { render, logger }: AI.ComponentContext
): AI.RenderableStream {
  yield AI.AppendOnlyStream;
  const messageElements = (
    await render(props.children, {
      stop: (e) =>
        e.tag == SystemMessage ||
        e.tag == UserMessage ||
        e.tag == AssistantMessage ||
        e.tag == FunctionCall ||
        e.tag == FunctionResponse,
    })
  ).filter(AI.isElement);

  const systemMessage = messageElements.filter((e) => e.tag == SystemMessage);
  const userMessages = messageElements.filter((e) => e.tag == UserMessage);
  if (systemMessage.length > 1) {
    throw new AIJSXError(
      'Replicate Llama2 does not support multiple system messages. Please use a single <SystemMessage>.',
      ErrorCode.Llama2DoesNotSupportMultipleSystemMessages,
      'user'
    );
  }
  if (userMessages.length > 1) {
    throw new AIJSXError(
      'Replicate Llama2 does not support multiple user messages. Please use a single <UserMessage>.',
      ErrorCode.Llama2DoesNotSupportMultipleUserMessages,
      'user'
    );
  }
  if (messageElements.find((e) => e.tag == AssistantMessage)) {
    throw new AIJSXError(
      'Replicate Llama2 does not support <AssistantMessage>. Please use <SystemMessage> instead.',
      ErrorCode.Llama2DoesNotSupportAssistantMessages,
      'user'
    );
  }
  if (messageElements.find((e) => e.tag == FunctionCall)) {
    throw new AIJSXError(
      'Replicate Llama2 does not support <FunctionCall>. Please use <SystemMessage> instead.',
      ErrorCode.Llama2DoesNotSupportFunctionCalls,
      'user'
    );
  }
  if (messageElements.find((e) => e.tag == FunctionResponse)) {
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
    system_prompt: systemMessage.length ? await render(systemMessage[0]) : undefined,
  };
  const response = await fetchLlama2(
    'replicate/llama70b-v2-chat:2d19859030ff705a87c746f7e96eea03aefb71f166725aee39692f1476566d48',
    llama2Args,
    logger
  );
  yield* response;
  return AI.AppendOnlyStream;
}

/**
 * Don't use this directly. Instead, wrap your `<Completion>` element in `<ReplicateLlama2>`.
 *
 * @hidden
 */
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
  const response = await fetchLlama2(
    'replicate/llama70b-v2-chat:e951f18578850b652510200860fc4ea62b3b16fac280f83ff32282f87bbd2e48',
    llama2Args,
    logger
  );
  yield* response;
  return AI.AppendOnlyStream;
}

/**
 * This component causes all children `ChatCompletion` and `Completion` components to use Replicate Llama2.
 *
 * Because Llama2 is open source, there's no single model provider like there is for OpenAI and Anthropic. This component uses the Replicate API to run Llama2 models. If you want to run a self-hosted Llama2, copy this source file and adapt it to point to your provider instead.
 *
 * You must set env var REPLICATE_API_TOKEN or REACT_REPLICATE_API_TOKEN for this to work.
 *
 * Drawbacks to the Replicate implementation:
 *  * You can only pass a single User Message.
 *  * You can only pass a single System Message.
 *  * You can't pass any Assistant Messages.
 *  * The Replicate JS client lib does not support streaming.
 *  * The Replicate API will sometimes return an empty string with no explanation.
 *      (This has been observed when passing maxTokens=50.)
 *
 * Drawbacks to Llama2 in general:
 *  * No support for functions
 */
export function ReplicateLlama2({ children, ...defaults }: Llama2ModelProps) {
  return (
    <ChatProvider component={Llama2ChatModel} {...defaults}>
      <CompletionProvider component={Llama2CompletionModel} {...defaults}>
        {children}
      </CompletionProvider>
    </ChatProvider>
  );
}
