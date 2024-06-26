/**
 * This module provides the core completion components for AI.JSX.
 * @packageDocumentation
 */

import * as AI from '../index.js';
import { Node, Component, RenderContext } from '../index.js';
import { AIJSXError, ErrorCode } from '../core/errors.js';
import { OpenAIChatModel, OpenAICompletionModel } from '../lib/openai.js';
import { getEnvVar } from '../lib/util.js';
import { AnthropicChatModel } from '../lib/anthropic.js';
import { type JSONSchema7 } from 'json-schema';
export {
  UserMessage,
  SystemMessage,
  AssistantMessage,
  FunctionCall,
  FunctionResponse,
  ConversationHistory,
} from './conversation.js';

/**
 * Represents properties passed to a given Large Language Model.
 */
export interface ModelProps {
  /** The temperature to use for LLM calls. */
  temperature?: number;
  /** The maximum number of tokens to generate. */
  maxTokens?: number;
  /** The number of tokens to reserve for the generation. */
  reservedTokens?: number;
  /** Maximum number of input tokens to allow.  */
  maxInputTokens?: number;
  /** A list of stop tokens. */
  stop?: string[];

  /**
   * An alternative sampling technique to temperature.
   *
   * @see https://platform.openai.com/docs/api-reference/chat/create#chat/create-top_p */
  topP?: number;

  /**
   * Any function definitions (tools) that the model can choose to invoke.
   */
  functionDefinitions?: Record<string, FunctionDefinition>;

  /**
   * If specified, the model will be forced to use this function.
   */
  forcedFunction?: string;
}

/**
 * Represents a {@link ModelProps} with child @{link Node}s.
 */
export type ModelPropsWithChildren = ModelProps & {
  children: Node;
};

/**
 * A Component that invokes a Large Language Model.
 */
export type ModelComponent<T extends ModelPropsWithChildren> = Component<T>;

/**
 * Represents a function definition that can be invoked using the {@link FunctionCall} component.
 */
export interface FunctionDefinition {
  description?: string;
  parameters: JSONSchema7 & { type?: 'object' };
}

/**
 * If env var `OPENAI_API_KEY` is defined, use Open AI as the completion model provider.
 *
 * This is internal and users should not need to access this directly.
 */
function AutomaticCompletionModel({ children, ...props }: ModelPropsWithChildren) {
  if (getEnvVar('OPENAI_API_KEY', false) || getEnvVar('OPENAI_API_BASE', false)) {
    return (
      <OpenAICompletionModel model="gpt-3.5-turbo-instruct" {...props}>
        {children}
      </OpenAICompletionModel>
    );
  }

  throw new AIJSXError(
    `No completion model was specified. To fix this, do one of the following:
    
1. Set the OPENAI_API_KEY or REACT_APP_OPENAI_API_KEY environment variable.
2. Set the OPENAI_API_BASE or REACT_APP_OPENAI_API_BASE environment variable.
3. use an explicit CompletionProvider component.`,
    ErrorCode.MissingCompletionModel,
    'user'
  );
}

/**
 * If env var `OPENAI_API_KEY` is defined, use Open AI as the chat model provider.
 *
 * This is internal and users should not need to access this directly.
 */
function AutomaticChatModel({ children, ...props }: ModelPropsWithChildren) {
  if (getEnvVar('OPENAI_API_KEY', false) || getEnvVar('OPENAI_API_BASE', false)) {
    return (
      <OpenAIChatModel model="gpt-3.5-turbo" {...props}>
        {children}
      </OpenAIChatModel>
    );
  }

  if (getEnvVar('ANTHROPIC_API_KEY', false)) {
    return (
      <AnthropicChatModel model="claude-instant-1" {...props}>
        {children}
      </AnthropicChatModel>
    );
  }

  throw new AIJSXError(
    `No chat model was specified. To fix this, do one of the following:
    
1. Set the OPENAI_API_KEY or REACT_APP_OPENAI_API_KEY environment variable.
2. Set the OPENAI_API_BASE or REACT_APP_OPENAI_API_BASE environment variable.
3. Set the ANTHROPIC_API_KEY or REACT_APP_ANTHROPIC_API_KEY environment variable.
4. use an explicit ChatProvider component.`,
    ErrorCode.MissingChatModel,
    'user'
  );
}

/** The default context used by {@link CompletionProvider}. */
const completionContext = AI.createContext<[ModelComponent<ModelPropsWithChildren>, ModelProps]>([
  AutomaticCompletionModel,
  {},
]);

/**
 * A CompletionProvider is used by {@link ChatCompletion} to access an underlying Large Language Model.
 */
export function CompletionProvider<T extends ModelPropsWithChildren>(
  { component, children, ...newDefaults }: { component?: ModelComponent<T> } & T,
  { getContext }: RenderContext
) {
  const [existingComponent, previousDefaults] = getContext(completionContext);
  return (
    <completionContext.Provider
      value={[
        (component ?? existingComponent) as ModelComponent<ModelPropsWithChildren>,
        { ...previousDefaults, ...newDefaults },
      ]}
    >
      {children}
    </completionContext.Provider>
  );
}

/** The default context used by {@link ChatProvider}. */
const chatContext = AI.createContext<[ModelComponent<ModelPropsWithChildren>, ModelProps]>([AutomaticChatModel, {}]);

/**
 * A ChatProvider is used by {@link ChatCompletion} to access an underlying Large Language Model.
 */
export function ChatProvider<T extends ModelPropsWithChildren>(
  { component, children, ...newDefaults }: { component?: ModelComponent<T> } & T,
  { getContext }: RenderContext
) {
  const [existingComponent, previousDefaults] = getContext(chatContext);
  return (
    <chatContext.Provider
      value={[
        (component ?? existingComponent) as ModelComponent<ModelPropsWithChildren>,
        { ...previousDefaults, ...newDefaults },
      ]}
    >
      {children}
    </chatContext.Provider>
  );
}

/**
 * Perform a Large Language Mokdel call to do a [completion](https://platform.openai.com/docs/guides/gpt/completions-api).
 *
 * In general, you should prefer to use {@link ChatCompletion} instead of {@link Completion}, because {@link ChatCompletion} uses better models.
 *
 * @example
 * ```tsx
 *    <Completion>
 *      Here's a list of three dog names:
 *    </Completion>
 *
 *    ==> 'Dottie, Murphy, Lucy'
 * ```
 */
export function Completion(
  { children, ...props }: ModelPropsWithChildren & Record<string, unknown>,
  { getContext }: RenderContext
) {
  const [CompletionComponent, defaultProps] = getContext(completionContext);
  return (
    <CompletionComponent {...defaultProps} {...props}>
      {children}
    </CompletionComponent>
  );
}

/**
 * Perform a Large Language Model call to do [chat completion](https://platform.openai.com/docs/guides/gpt/chat-completions-api).
 *
 * Every child of {@link ChatCompletion} must something that renders to a {@link SystemMessage}, {@link UserMessage}, or {@link AssistantMessage}.
 *
 * @example
 * ```tsx
 *    function MyUserMessage() {
 *     return <UserMessage>Hi, I'm a user message.</UserMessage>;
 *    }
 *
 *    <ChatCompletion>
 *      <SystemMessage>You are a nice person.</SystemMessage>
 *      <MyUserMessage />
 *    </ChatCompletion>
 * ```
 */
export function ChatCompletion(
  { children, ...props }: ModelPropsWithChildren & Record<string, unknown>,
  { getContext }: RenderContext
) {
  const [ChatComponent, defaultProps] = getContext(chatContext);
  return (
    <ChatComponent {...defaultProps} {...props}>
      {children}
    </ChatComponent>
  );
}
