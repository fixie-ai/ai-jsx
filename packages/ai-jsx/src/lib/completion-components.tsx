import { LLMx } from '../lib/index.ts';
import { OpenAIChatModel, OpenAICompletionModel } from './openai.tsx';

export interface ModelProps {
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
}

export type ModelPropsWithChildren = ModelProps & {
  children: LLMx.Node;
};

export type ModelComponent<T extends ModelPropsWithChildren> = LLMx.Component<T>;

function AutomaticCompletionModel({ children, ...props }: ModelPropsWithChildren) {
  if (process.env.OPENAI_API_KEY) {
    return (
      <OpenAICompletionModel model="text-davinci-003" {...props}>
        {children}
      </OpenAICompletionModel>
    );
  }
  // TODO: Change this to throw once we support error boundaries.
  return 'No completion model was specified. Specify a CompletionProvider or set the OPENAI_API_KEY environment variable.';
  // throw new Error(
  //   'No completion model was specified. Specify a CompletionProvider or set the OPENAI_API_KEY environment variable.'
  // );
}

function AutomaticChatModel({ children, ...props }: ModelPropsWithChildren) {
  if (process.env.OPENAI_API_KEY) {
    return (
      <OpenAIChatModel model="gpt-3.5-turbo" {...props}>
        {children}
      </OpenAIChatModel>
    );
  }
  // TODO: Change this to throw once we support error boundaries.
  return 'No chat model was specified. Specify a ChatProvider or set the OPENAI_API_KEY environment variable.';
  // throw new Error(
  //   'No chat model was specified. Specify a ChatProvider or set the OPENAI_API_KEY environment variable.'
  // );
}

const completionContext = LLMx.createContext<[ModelComponent<ModelPropsWithChildren>, ModelProps]>([
  AutomaticCompletionModel,
  {},
]);
const chatContext = LLMx.createContext<[ModelComponent<ModelPropsWithChildren>, ModelProps]>([AutomaticChatModel, {}]);

export function CompletionProvider<T extends ModelPropsWithChildren>(
  { component, children, ...newDefaults }: { component?: ModelComponent<T> } & T,
  { getContext }: LLMx.RenderContext
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
  { getContext }: LLMx.RenderContext
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

export function SystemMessage({ children }: { children: LLMx.Node }) {
  return children;
}
export function UserMessage({ children }: { name?: string; children: LLMx.Node }) {
  return children;
}
export function AssistantMessage({ children }: { children: LLMx.Node }) {
  return children;
}

export function Completion(
  { children, ...props }: ModelPropsWithChildren & Record<string, unknown>,
  { getContext }: LLMx.RenderContext
) {
  const [CompletionComponent, defaultProps] = getContext(completionContext);
  return (
    <CompletionComponent {...defaultProps} {...props}>
      {children}
    </CompletionComponent>
  );
}

export function ChatCompletion(
  { children, ...props }: ModelPropsWithChildren & Record<string, unknown>,
  { getContext }: LLMx.RenderContext
) {
  const [ChatComponent, defaultProps] = getContext(chatContext);
  return (
    <ChatComponent {...defaultProps} {...props}>
      {children}
    </ChatComponent>
  );
}
