import AnthropicSDK from '@anthropic-ai/sdk';
import { getEnvVar } from './util.js';
import * as AI from '../index.js';
import { Node } from '../index.js';
import { ChatProvider, ModelPropsWithChildren } from '../core/completion.js';
import { AssistantMessage, FunctionCall, renderToConversation } from '../core/conversation.js';
import { AIJSXError, ErrorCode } from '../core/errors.js';
import { debugRepresentation } from '../core/debug.js';
import _ from 'lodash';

export const AnthropicClient = AnthropicSDK;

const anthropicClientContext = AI.createContext<() => AnthropicSDK>(
  _.once(
    () =>
      new AnthropicSDK({
        apiKey: getEnvVar('ANTHROPIC_API_KEY', false),
      })
  )
);

/**
 * The set of valid Claude models.
 *
 * @see https://docs.anthropic.com/claude/reference/complete_post.
 */
export type ValidChatModel = AnthropicSDK.MessageCreateParamsStreaming['model'];

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
  client,
  completionModel,
  ...defaults
}: { children: Node; client?: AnthropicSDK; chatModel?: ValidChatModel; completionModel?: never } & Omit<
  AnthropicChatModelProps,
  'children' | 'model'
>) {
  let result = children;

  if (client) {
    result = <anthropicClientContext.Provider value={() => client}>{children}</anthropicClientContext.Provider>;
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
  useBetaTools?: boolean;
}
export async function* AnthropicChatModel(
  props: AnthropicChatModelProps,
  { render, getContext, logger, memo }: AI.ComponentContext
): AI.RenderableStream {
  yield AI.AppendOnlyStream;

  const anthropic = getContext(anthropicClientContext)();
  const messages = await renderToConversation(props.children, render, logger, 'prompt');

  const legacyModels: Record<string, string> = {
    'claude-1': 'claude-1.3',
    'claude-1-100k': 'claude-1.3',
    'claude-2': 'claude-2.1',
    'claude-instant-1': 'claude-instant-1.2',
    'claude-instant-1-100k': 'claude-instant-1.2',
    'claude-instant-1.1-100k': 'claude-instant-1.1',
  };
  const resolvedModel = props.model in legacyModels ? legacyModels[props.model] : props.model;
  /**
   * From https://docs.anthropic.com/claude/docs/legacy-model-guide#anthropics-legacy-models
   * > Our legacy models include Claude Instant 1.2, Claude 2.0, and Claude 2.1. Of these legacy models, Claude 2.1 is the only model with system prompt support (all Claude 3 models have full system prompt support).
   */
  const supportsSystemPrompt = !(
    resolvedModel.startsWith('claude-1') ||
    resolvedModel.startsWith('claude-instant') ||
    resolvedModel.startsWith('claude-2.0')
  );
  const leadingSystemMessages = _.takeWhile(messages, (m) => supportsSystemPrompt && m.type === 'system');
  const commonRequestProperties = {
    system: (await Promise.all(leadingSystemMessages.map((m) => render(m.element)))).join('\n\n') || undefined,
    model: resolvedModel,
    max_tokens: props.maxTokens ?? defaultMaxTokens,
    temperature: props.temperature,
    stop_sequences: props.stop,
    top_p: props.topP,
  };

  type MessageParamWithoutStrings = AnthropicSDK.Beta.Tools.ToolsBetaMessageParam & { content: unknown[] };

  const hasFunctionDefinitions = Object.keys(props.functionDefinitions ?? {}).length > 0;
  const useBetaTools = props.useBetaTools ?? hasFunctionDefinitions;

  const anthropicMessages: MessageParamWithoutStrings[] = (
    await Promise.all(
      messages
        .slice(leadingSystemMessages.length)
        .map<Promise<MessageParamWithoutStrings | MessageParamWithoutStrings[]>>(async (m) => {
          switch (m.type) {
            case 'user':
            case 'assistant':
              return { role: m.type, content: [{ type: 'text', text: await render(m.element) }] };
            case 'system': {
              // Polyfill system messages that are either not supported or do not appear at the start of the prompt.
              const text = await render(m.element);
              return [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `For subsequent replies you will adhere to the following instructions: ${text}`,
                    },
                  ],
                },
                { role: 'assistant', content: [{ type: 'text', text: 'Okay, I will do that.' }] },
              ];
            }
            case 'functionCall':
              return {
                role: 'assistant',
                content: useBetaTools
                  ? [
                      {
                        type: 'tool_use',
                        id: m.element.props.id!,
                        name: m.element.props.name,
                        input: m.element.props.args,
                      },
                    ]
                  : [
                      {
                        type: 'text',
                        text: await render(
                          <>
                            {'<'}function_calls{'>'}
                            {'\n'}
                            {'<'}invoke{'>'}
                            {'\n'}
                            {'<'}tool_name{'>'}
                            {m.element.props.name}
                            {'<'}/tool_name{'>'}
                            {'\n'}
                            {'<'}parameters{'>'}
                            {'\n'}
                            {Object.entries(m.element.props.args).map(([key, value]) => (
                              <>
                                {'<'}
                                {key}
                                {'>'}
                                {value}
                                {'<'}/{key}
                                {'>'}
                                {'\n'}
                              </>
                            ))}
                            {'<'}/parameters{'>'}
                            {'\n'}
                            {'<'}/invoke{'>'}
                            {'\n'}
                            {'<'}/function_calls{'>'}
                          </>
                        ),
                      },
                    ],
              };
            case 'functionResponse':
              return {
                role: 'user',
                content: useBetaTools
                  ? [
                      {
                        type: 'tool_result',
                        tool_use_id: m.element.props.id!,
                        content: [{ type: 'text', text: await render(m.element.props.children) }],
                        is_error: m.element.props.failed,
                      },
                    ]
                  : [
                      {
                        type: 'text',
                        text: await render(
                          <>
                            {'<'}function_results{'>'}
                            {'\n'}
                            {'<'}result{'>'}
                            {'\n'}
                            {'<'}tool_name{'>'}
                            {m.element.props.name}
                            {'<'}/tool_name{'>'}
                            {'\n'}
                            {m.element.props.failed ? (
                              <>
                                {'<'}error{'>'}
                                {'\n'}
                                {m.element.props.children}
                                {'</'}error{'>'}
                                {'\n'}
                              </>
                            ) : (
                              <>
                                {'<'}stdout{'>'}
                                {'\n'}
                                {m.element.props.children}
                                {'\n'}
                                {'</'}stdout{'>'}
                                {'\n'}
                              </>
                            )}
                            {'<'}/invoke{'>'}
                            {'\n'}
                            {'<'}/function_results{'>'}
                          </>
                        ),
                      },
                    ],
              };
            default:
              return [] as MessageParamWithoutStrings[];
          }
        })
    )
  ).flat(1);

  if (props.forcedFunction && props.functionDefinitions && props.forcedFunction in props.functionDefinitions) {
    const polyfillPrompt: MessageParamWithoutStrings = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Use the \`${props.forcedFunction}\` tool.`,
        },
      ],
    };
    logger.warn(
      { forcedFunction: props.forcedFunction, addedUserMessage: polyfillPrompt },
      'Anthropic does not directly support forced functions. Adding additional user message to prompt.'
    );
    anthropicMessages.push(polyfillPrompt);
  } else if (props.forcedFunction) {
    throw new AIJSXError(
      `The function ${props.forcedFunction} was forced, but no function with that name was defined.`,
      ErrorCode.ChatCompletionBadInput,
      'user'
    );
  }

  // Combine any adjacent user and assistant messages.
  const combinedAnthropicMessages: typeof anthropicMessages = [];
  for (const message of anthropicMessages) {
    const lastMessage = combinedAnthropicMessages.at(-1);
    if (lastMessage?.role === message.role) {
      lastMessage.content.push(...message.content);
    } else {
      combinedAnthropicMessages.push(message);
    }
  }

  if (useBetaTools) {
    // If there are tools in the prompt, we need to use the tools API (which currently does not support streaming).
    const toolsRequest: AnthropicSDK.Beta.Tools.MessageCreateParamsNonStreaming = {
      messages: combinedAnthropicMessages,
      tools: Object.entries(props.functionDefinitions ?? {}).map(([functionName, definition]) => ({
        name: functionName,
        description: definition.description,
        input_schema: definition.parameters as any,
      })),
      stream: false,
      ...commonRequestProperties,
    };
    logger.debug({ toolsRequest }, 'Calling anthropic.beta.tools.messages.create');
    try {
      const result = await anthropic.beta.tools.messages.create(toolsRequest);
      return result.content.map((contentBlock) =>
        contentBlock.type === 'text' ? (
          <AssistantMessage>{contentBlock.text}</AssistantMessage>
        ) : (
          <FunctionCall id={contentBlock.id} name={contentBlock.name} args={contentBlock.input as any} />
        )
      );
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
  }

  if (hasFunctionDefinitions) {
    throw new AIJSXError(
      'Anthropic models only support functions via the beta tools API, but useBetaTools was set to false.',
      ErrorCode.ChatModelDoesNotSupportFunctions,
      'user'
    );
  }

  const anthropicCompletionRequest: AnthropicSDK.MessageCreateParamsStreaming = {
    messages: combinedAnthropicMessages as AnthropicSDK.MessageParam[],
    ...commonRequestProperties,
    stream: true,
  };

  logger.debug({ anthropicCompletionRequest }, 'Calling anthropic.messages.create');

  const responsePromise = anthropic.messages.create(anthropicCompletionRequest);
  let response: Awaited<typeof responsePromise>;
  try {
    response = await anthropic.messages.create(anthropicCompletionRequest);
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
  let accumulatedContent = '';
  let complete = false;
  const Stream = async function* (): AI.RenderableStream {
    yield AI.AppendOnlyStream;
    for await (const deltaEvent of response) {
      logger.trace({ deltaEvent }, 'Got Anthropic stream event');
      switch (deltaEvent.type) {
        case 'message_start':
        case 'message_stop':
        case 'content_block_start':
        case 'content_block_stop':
          break;
        case 'message_delta':
          logger.setAttribute('anthropic.usage', JSON.stringify(deltaEvent.usage));
          if (deltaEvent.delta.stop_reason) {
            logger.setAttribute('anthropic.stop_reason', deltaEvent.delta.stop_reason);
          }
          break;
        case 'content_block_delta':
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (deltaEvent.delta.type === 'text_delta') {
            accumulatedContent += deltaEvent.delta.text;
            yield deltaEvent.delta.text;
          }
          break;
      }
    }

    complete = true;
    logger.debug({ completion: accumulatedContent }, 'Anthropic completion finished');
    return AI.AppendOnlyStream;
  };
  const assistantMessage = memo(
    <AssistantMessage>
      {<Stream {...debugRepresentation(() => `${accumulatedContent}${complete ? '' : '▮'}`)} />}
    </AssistantMessage>
  );
  yield assistantMessage;

  // Flush the stream to ensure that this element completes rendering only after the stream has completed.
  await renderToConversation(assistantMessage, render, logger, 'completion');
  return AI.AppendOnlyStream;
}
