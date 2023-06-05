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

export type ModelComponent<T> = LLMx.Component<ModelPropsWithChildren & T>;

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

const completionComponentCtx = LLMx.createContext<ModelComponent<any>>(AutomaticCompletionModel);
const completionDefaultsCtx = LLMx.createContext<ModelProps>({});
const chatComponentCtx = LLMx.createContext<ModelComponent<any>>(AutomaticChatModel);
const chatDefaultsCtx = LLMx.createContext<ModelProps>({});

export function CompletionProvider<T>(
  { component, children, ...defaults }: { component?: ModelComponent<T>; children: LLMx.Node } & ModelProps & T,
  { getContext }: LLMx.RenderContext
) {
  const existingComponent = getContext(completionComponentCtx);
  const existingProps = getContext(completionDefaultsCtx);

  return (
    <completionComponentCtx.Provider value={component ?? existingComponent}>
      <completionDefaultsCtx.Provider value={{ ...existingProps, ...defaults }}>
        {children}
      </completionDefaultsCtx.Provider>
    </completionComponentCtx.Provider>
  );
}

export function ChatProvider<T>(
  { component, children, ...defaults }: { component?: ModelComponent<T>; children: LLMx.Node } & ModelProps & T,
  { getContext }: LLMx.RenderContext
) {
  const existingComponent = getContext(chatComponentCtx);
  const existingProps = getContext(chatDefaultsCtx);

  return (
    <chatComponentCtx.Provider value={component ?? existingComponent}>
      <chatDefaultsCtx.Provider value={{ ...existingProps, ...defaults }}>{children}</chatDefaultsCtx.Provider>
    </chatComponentCtx.Provider>
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
  const CompletionComponent = getContext(completionComponentCtx);
  const defaultProps = getContext(completionDefaultsCtx);

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
  const ChatComponent = getContext(chatComponentCtx);
  const defaultProps = getContext(chatDefaultsCtx);

  return (
    <ChatComponent {...defaultProps} {...props}>
      {children}
    </ChatComponent>
  );
}
