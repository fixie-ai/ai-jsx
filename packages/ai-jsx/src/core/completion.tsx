import * as LLMx from '../index.js';
import { Node, Component, RenderContext } from '../index.js';
import { OpenAIChatModel, OpenAICompletionModel } from '../lib/openai.js';

export interface ModelProps {
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
}

export type ModelPropsWithChildren = ModelProps & {
  children: Node;
};

export type ModelComponent<T extends ModelPropsWithChildren> = Component<T>;

export type FunctionDefinition = {
  name: string;
  description?: string;
  parameters: Record<string, FunctionParameter>;
}

export type FunctionParameter = {
  description?: string;
  type?: string;
  required: boolean;
}

/**
 * If env var `OPENAI_API_KEY` is defined, use Open AI as the completion model provider.
 *
 * This is internal and users should not need to access this directly.
 */
function AutomaticCompletionModel({ children, ...props }: ModelPropsWithChildren) {
  if (process.env.OPENAI_API_KEY) {
    return (
      <OpenAICompletionModel model="text-davinci-003" {...props}>
        {children}
      </OpenAICompletionModel>
    );
  }

  throw new Error(
    'No completion model was specified. Set the OPENAI_API_KEY environment variable to use OpenAI or use an explicit CompletionProvider.'
  );
}

/**
 * If env var `OPENAI_API_KEY` is defined, use Open AI as the chat model provider.
 *
 * This is internal and users should not need to access this directly.
 */
function AutomaticChatModel({ children, ...props }: ModelPropsWithChildren) {
  if (process.env.OPENAI_API_KEY) {
    return (
      <OpenAIChatModel model="gpt-3.5-turbo" {...props}>
        {children}
      </OpenAIChatModel>
    );
  }
  throw new Error(
    'No chat model was specified. Set the OPENAI_API_KEY environment variable to use OpenAI or use an explicit ChatProvider.'
  );
}

const completionContext = LLMx.createContext<[ModelComponent<ModelPropsWithChildren>, ModelProps]>([
  AutomaticCompletionModel,
  {},
]);
const chatContext = LLMx.createContext<[ModelComponent<ModelPropsWithChildren>, ModelProps]>([AutomaticChatModel, {}]);

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
 * Provide a System Message to the chat model.
 *
 * The system message can be used to put the model in character. See https://platform.openai.com/docs/guides/gpt/chat-completions-api for more detail.
 *
 * This component can only be used within a ChatCompletion.
 *
 * @example
 *    <ChatCompletion>
 *      <SystemMessage>You are a helpful customer service agent.</SystemMessage>
 */
export function SystemMessage({ children }: { children: Node }) {
  return children;
}

/**
 * Provide a User Message to the chat model.
 *
 * The user message tells the model what the user has said. See https://platform.openai.com/docs/guides/gpt/chat-completions-api for more detail.
 *
 * This component can only be used within a ChatCompletion.
 *
 * @example
 *    <ChatCompletion>
 *      <UserMessage>I'd like to cancel my account.</UserMessage>
 *
 *    ==> 'Sorry to hear that. Can you tell me why?
 */
export function UserMessage({ children }: { name?: string; children: Node }) {
  return children;
}

/**
 * Provide an Assistant Message to the chat model.
 *
 * The assistant message tells the model what it has previously said. See https://platform.openai.com/docs/guides/gpt/chat-completions-api for more detail.
 *
 * This component can only be used within a ChatCompletion.
 *
 * @example
 *    <ChatCompletion>
 *      <UserMessage>I'd like to cancel my account.</UserMessage>
 *      <AssistantMessage>Sorry to hear that. Can you tell me why?</AssistantMessage>
 *      <UserMessage>It's too expensive.</UserMessage>
 *
 *    ==> "Ok, thanks for that feedback. I'll cancel your account."
 */
export function AssistantMessage({ children }: { children: Node }) {
  return children;
}

/**
 * Perform a model call to do a [completion](https://platform.openai.com/docs/guides/gpt/completions-api).
 *
 * In general, you should prefer to use ChatCompletion instead of Completion, because ChatCompletion uses better models.
 *
 * @example
 *    <Completion>
 *      Here's a list of three dog names:
 *    </Completion>
 *
 *    ==> 'Dottie, Murphy, Lucy'
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
 * Perform a model call to do [chat completion](https://platform.openai.com/docs/guides/gpt/chat-completions-api).
 *
 * Every child of ChatCompletion must something that renders to a SystemMessage, UserMessage, or AssistantMessage.
 *
 * @example
 *    function MyUserMessage() {
 *     return <UserMessage>Hi, I'm a user message.</UserMessage>;
 *    }
 *
 *    <ChatCompletion>
 *      <SystemMessage>You are a nice person.</SystemMessage>
 *      {/* This is fine, because MyUserMessage renders to a UserMessage. *}
 *      <MyUserMessage />
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
