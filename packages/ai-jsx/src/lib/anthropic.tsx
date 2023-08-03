import AnthropicSDK from '@anthropic-ai/sdk';
import { getEnvVar } from './util.js';
import * as AI from '../index.js';
import { Node } from '../index.js';
import { ChatOrCompletionModelOrBoth } from './model.js';
import { ChatProvider, ModelProps, ModelPropsWithChildren } from '../core/completion.js';
import { AssistantMessage, ConversationMessage, UserMessage, renderToConversation } from '../core/conversation.js';
import { AIJSXError, ErrorCode } from '../core/errors.js';

export const anthropicClientContext = AI.createContext<AnthropicSDK>(
  new AnthropicSDK({
    apiKey: getEnvVar('ANTHROPIC_API_KEY', false),
  })
);

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
 * If you use an Anthropic model without specifying the max tokens for the completion, this value will be used as the default.
 */
export const defaultMaxTokens = 1000;

/**
 * An AI.JSX component that invokes an Anthropic Large Language Model.
 * @param children The children to render.
 * @param chatModel The chat model to use.
 * @param completionModel The completion model to use.
 * @param client The Anthropic client.
 */
export function Anthropic({
  children,
  chatModel,
  completionModel,
  client,
  ...defaults
}: { children: Node; client?: AnthropicSDK } & AnthropicModelChoices & ModelProps) {
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
    throw new AIJSXError(
      'Completion models are not supported by Anthropic',
      ErrorCode.AnthropicDoesNotSupportCompletionModels,
      'user'
    );
  }

  return result;
}

interface AnthropicChatModelProps extends ModelPropsWithChildren {
  model: ValidChatModel;
}
export async function* AnthropicChatModel(
  props: AnthropicChatModelProps,
  { render, getContext, logger, memo }: AI.ComponentContext
): AI.RenderableStream {
  if ('functionDefinitions' in props) {
    throw new AIJSXError(
      'Anthropic does not support function calling, but function definitions were provided.',
      ErrorCode.ChatModelDoesNotSupportFunctions,
      'user'
    );
  }
  yield AI.AppendOnlyStream;
  const messages = await Promise.all(
    // TODO: Support token budget/conversation shrinking
    (
      await renderToConversation(props.children, render)
    )
      .flatMap<Exclude<ConversationMessage, { type: 'system' }>>((message) => {
        if (message.type === 'system') {
          return [
            {
              type: 'user',
              element: (
                <UserMessage>
                  For subsequent replies you will adhere to the following instructions: {message.element}
                </UserMessage>
              ),
            },
            { type: 'assistant', element: <AssistantMessage>Okay, I will do that.</AssistantMessage> },
          ];
        }

        return [message];
      })
      .map(async (message) => {
        switch (message.type) {
          case 'user':
            return `${AnthropicSDK.HUMAN_PROMPT}:${
              message.element.props.name ? ` (${message.element.props.name})` : ''
            } ${await render(message.element)}`;
          case 'assistant':
            return `${AnthropicSDK.AI_PROMPT}: ${await render(message.element)}`;
          case 'functionCall':
          case 'functionResponse':
            throw new AIJSXError(
              'Anthropic models do not support functions.',
              ErrorCode.AnthropicDoesNotSupportFunctions,
              'user'
            );
        }
      })
  );

  if (!messages.length) {
    throw new AIJSXError(
      "ChatCompletion must have at least one child that's UserMessage or AssistantMessage, but no such children were found.",
      ErrorCode.ChatCompletionMissingChildren,
      'user'
    );
  }

  messages.push(AnthropicSDK.AI_PROMPT);

  const anthropic = getContext(anthropicClientContext);
  const anthropicCompletionRequest: AnthropicSDK.CompletionCreateParams = {
    prompt: messages.join('\n\n'),
    max_tokens_to_sample: props.maxTokens ?? defaultMaxTokens,
    temperature: props.temperature,
    model: props.model,
    stop_sequences: props.stop,
    stream: true,
    top_p: props.topP,
  };

  logger.debug({ anthropicCompletionRequest }, 'Calling createCompletion');

  let response: Awaited<ReturnType<typeof anthropic.completions.create>>;
  try {
    response = await anthropic.completions.create(anthropicCompletionRequest);
  } catch (err) {
    if (err instanceof AnthropicSDK.APIError) {
      throw new AIJSXError(
        err.message,
        ErrorCode.AnthropicAPIError,
        'runtime',
        Object.fromEntries(Object.entries(err))
      );
    }
    throw err;
  }

  // Embed the stream "within" an <AssistantMessage>, memoizing it to ensure it's only consumed once.
  yield (
    <AssistantMessage>
      {memo(
        (async function* (): AI.RenderableStream {
          yield AI.AppendOnlyStream;
          let resultSoFar = '';
          let isFirstResponse = true;
          for await (const completion of response) {
            let text = completion.completion;
            if (isFirstResponse && text.length > 0) {
              isFirstResponse = false;
              if (text.startsWith(' ')) {
                text = text.slice(1);
              }
            }
            resultSoFar += text;
            logger.trace({ completion }, 'Got Anthropic stream event');
            yield text;
          }

          logger.debug({ completion: resultSoFar }, 'Anthropic completion finished');
          return AI.AppendOnlyStream;
        })()
      )}
    </AssistantMessage>
  );

  return AI.AppendOnlyStream;
}
