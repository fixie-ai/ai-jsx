import { ChatProvider, CompletionProvider, ModelProps, ModelPropsWithChildren } from '../core/completion.js';
import { ErrorCode } from '../core/errors.js';
import * as AI from '../index.js';
import { getPolyfilledMessages } from './anthropic.js';
import { Node } from '../index.js';

interface Llama2ModelProps extends ModelProps {
  /** Penalty for repeated words in the output. Must be in the range [0.01, 5]. */
  repetitionPenalty?: number;
}

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
  repetition_penalty?: Llama2ModelProps['repetitionPenalty'];

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

interface Llama2Props extends ModelPropsWithChildren, Pick<Llama2ModelProps, 'repetitionPenalty'> {
  fetch: FetchLlama2;
}

/**
 * If you use a Llama2 model without specifying the max tokens for the completion, this value will be used as the default.
 */
export const defaultMaxTokens = 500;

async function* Llama2ChatModel(props: Llama2Props, { render, logger }: AI.ComponentContext): AI.RenderableStream {
  const messages = await getPolyfilledMessages(
    props.children,
    render,
    'Llama2',
    ErrorCode.Llama2DoesNotSupportFunctions
  );
  yield AI.AppendOnlyStream;
  const prompt = messages.join('\n\n');
  const llama2Args: FetchLlama2Args = {
    prompt,
    max_length: props.maxTokens ?? defaultMaxTokens,
    repetition_penalty: props.repetitionPenalty,
    temperature: props.temperature,
    top_p: props.topP,
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
 * @param children The children to render.
 * @param client The Anthropic client.
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

export function ReplicateLlama2({ children, ...defaults }: { children: Node } & Llama2ModelProps) {
  return <Llama2 {...defaults}>{children}</Llama2>;
}
