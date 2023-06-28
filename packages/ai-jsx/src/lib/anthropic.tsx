import Anthropic from '@anthropic-ai/sdk';
import { getEnvVar } from './util.js';
import * as AI from '../index.js';
import { ChatOrCompletionModelOrBoth } from './model.js';
import { AssistantMessage, ChatProvider, FunctionCall, FunctionResponse, ModelProps, SystemMessage, UserMessage, ModelPropsWithChildren } from '../core/completion.js';
import { AIJSXError, ErrorCode } from '../core/errors.js';

export const anthropicClientContext = AI.createContext<Anthropic>(new Anthropic({
  apiKey: getEnvVar('ANTHROPIC_API_KEY', false),
}));

type ValidCompletionModel = never;
/**
 * The set of valid Claude models.
 * 
 * @see https://docs.anthropic.com/claude/reference/complete_post.
 */
type ValidChatModel = 
| 'claude-1'
| 'claude-1-100k'
| 'claude-instant-1'
| 'claude-instant-1-100k'
| 'claude-1.3'
| 'claude-1.3-100k'
| 'claude-1.2'
| 'claude-1.0'
| 'claude-instant-1.1'
| 'claude-instant-1.1-100k'
| 'claude-instant-1.0';

type AnthropicModelChoices = ChatOrCompletionModelOrBoth<ValidChatModel, ValidCompletionModel>;

/**
 * An AI.JSX component that invokes an Anthropic Large Language Model.
 * @param children The children to render.
 * @param chatModel The chat model to use.
 * @param completionModel The completion model to use.
 * @param client The OpenAI client.
 */
export function OpenAI({
  children,
  chatModel,
  completionModel,
  client,
  ...defaults
}: { children: Node; client?: Anthropic } & AnthropicModelChoices & ModelProps) {
  let result = children;

  if (client) {
    result = <anthropicClientContext.Provider value={client}>{children}</anthropicClientContext.Provider>;
  }

  if (chatModel) {
    result = (
      <ChatProvider component={AnthropicChatModel} {...defaults} model={chatModel}>
        {result}
      </ChatProvider>
    );
  }

  // TS is correct that this should never happen, but we'll check for it anyway.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (completionModel) {
    throw new AIJSXError('Completion models are not supported by Anthropic', ErrorCode.AnthropicDoesNotSupportCompletionModels, 'user');
  }

  return result;
}

interface AnthropicChatModelProps extends ModelPropsWithChildren {
  model: ValidChatModel;
}
export async function* AnthropicChatModel(props: AnthropicChatModelProps, {render, getContext, logger}: AI.ComponentContext) {
  const messageElements = await render(props.children, {
    stop: (e) =>
      e.tag == SystemMessage ||
      e.tag == UserMessage ||
      e.tag == AssistantMessage ||
      e.tag == FunctionCall ||
      e.tag == FunctionResponse,
  });
  yield AI.AppendOnlyStream;
  const messages = await Promise.all(
    messageElements.filter(AI.isElement).map(async (message) => {
      switch (message.tag) {
        case UserMessage:
          return `${Anthropic.HUMAN_PROMPT}: ${await render(message)}`
          case AssistantMessage:
          return `${Anthropic.AI_PROMPT}: ${await render(message)}`
        case SystemMessage:
          throw new AIJSXError('Anthropic models do not support SystemMessage. Change your user message to instruct the model what to do.', ErrorCode.AnthropicDoesNotSupportSystemMessage, 'user')
        case FunctionCall:
        case FunctionResponse:
          throw new AIJSXError('Anthropic models do not support functions.', ErrorCode.AnthropicDoesNotSupportFunctions, 'user')
        default:
          throw new AIJSXError(
            `ChatCompletion's prompts must be UserMessage or AssistantMessage, but this child was ${message.tag.name}`,
            ErrorCode.ChatCompletionUnexpectedChild,
            'internal'
          );
      }
    })
  );

  if (!messages.length) {
    throw new AIJSXError(
      "ChatCompletion must have at least child that's a SystemMessage, UserMessage, AssistantMessage, FunctionCall, or FunctionResponse, but no such children were found.",
      ErrorCode.ChatCompletionMissingChildren,
      'user'
    );
  }

  messages.push(Anthropic.AI_PROMPT);

  const anthropic = getContext(anthropicClientContext);
  const anthropicCompletionRequest: Anthropic.CompletionCreateParams = {
    prompt: messages.join('\n\n'),
    max_tokens_to_sample: props.maxTokens ?? 1000,
    temperature: props.temperature,
    model: props.model,
    stop_sequences: props.stop,
    stream: true,
  }

  logger.debug({ anthropicCompletionRequest }, 'Calling createCompletion');

  const response = await anthropic.completions.create(anthropicCompletionRequest);
}
