import { ChatCompletionResponseMessage } from 'openai';
import * as AI from '../index.js';
import { Node } from '../index.js';
import { AIJSXError, ErrorCode } from '../core/errors.js';

/**
 * Provide a System Message to the LLM, for use within a {@link ChatCompletion}.
 *
 * The system message can be used to put the model in character. See https://platform.openai.com/docs/guides/gpt/chat-completions-api for more detail.
 *
 * @example
 * ```tsx
 *    <ChatCompletion>
 *      <SystemMessage>You are a helpful customer service agent.</SystemMessage>
 *    </ChatCompletion>
 * ```
 */
export function SystemMessage({ children }: { children: Node }) {
  return children;
}

/**
 * Provide a User Message to the LLM, for use within a {@link ChatCompletion}.
 *
 * The user message tells the model what the user has said. See https://platform.openai.com/docs/guides/gpt/chat-completions-api for more detail.
 *
 * @example
 * ```tsx
 *    <ChatCompletion>
 *      <UserMessage>I'd like to cancel my account.</UserMessage>
 *    </ChatCompletion>
 *
 *    ==> 'Sorry to hear that. Can you tell me why?
 * ```
 */
export function UserMessage({ children }: { name?: string; children: Node }) {
  return children;
}

/**
 * Provide an Assistant Message to the LLM, for use within a {@link ChatCompletion}.
 *
 * The assistant message tells the model what it has previously said. See https://platform.openai.com/docs/guides/gpt/chat-completions-api for more detail.
 *
 * @example
 * ```tsx
 *    <ChatCompletion>
 *      <UserMessage>I'd like to cancel my account.</UserMessage>
 *      <AssistantMessage>Sorry to hear that. Can you tell me why?</AssistantMessage>
 *      <UserMessage>It's too expensive.</UserMessage>
 *    </ChatCompletion>
 * ```
 *
 *    ==> "Ok, thanks for that feedback. I'll cancel your account."
 */
export function AssistantMessage({ children }: { children: Node }) {
  return children;
}

export function ConversationHistory({ messages }: { messages: ChatCompletionResponseMessage[] }) {
  return messages.map((message) => {
    switch (message.role) {
      case 'system':
        return <SystemMessage>{message.content}</SystemMessage>;
      case 'user':
        return <UserMessage>{message.content}</UserMessage>;
      case 'assistant':
        return <AssistantMessage>{message.content}</AssistantMessage>;
      case 'function':
        return (
          <FunctionCall name={message.function_call!.name!} args={JSON.parse(message.function_call!.arguments!)} />
        );
    }
  });
}

/**
 * Provide a function call to the LLM, for use within a {@link ChatCompletion}.
 *
 * The function call tells the model that a function was previously invoked by the model. See https://platform.openai.com/docs/guides/gpt/chat-completions-api for more detail.
 * When the model returns a function call, @{link ChatCompletion} returns a @{link FunctionCall} component.
 *
 * @example
 * ```tsx
 *    <ChatCompletion>
 *      <UserMessage>What is 258 * 322?</UserMessage>
 *      <FunctionCall name="evaluate_math" args={expression: "258 * 322"} />
 *      <FunctionResponse name="evaluate_math">83076</FunctionResponse>
 *    </ChatCompletion>
 *
 *    ==> "That would be 83,076."
 * ```
 */
export function FunctionCall({
  name,
  partial,
  args,
}: {
  name: string;
  partial?: boolean;
  args: Record<string, string | number | boolean | null>;
}) {
  return `Call function ${name} with ${partial ? '(incomplete) ' : ''}${JSON.stringify(args)}`;
}

/**
 * Renders to the output of a previous {@link FunctionCall} component, for use within a {@link ChatCompletion}.
 *
 * See https://platform.openai.com/docs/guides/gpt/chat-completions-api for more detail.
 *
 * @example
 * ```tsx
 *    <ChatCompletion>
 *      <UserMessage>What is 258 * 322?</UserMessage>
 *      <FunctionCall name="evaluate_math" args={expression: "258 * 322"} />
 *      <FunctionResponse name="evaluate_math">83076</FunctionResponse>
 *    </ChatCompletion>
 *
 *    ==> "That would be 83,076."
 * ```
 */
export function FunctionResponse({ name, failed, children }: { name: string; failed?: boolean; children: Node }) {
  if (failed) {
    return (
      <>
        function {name} failed with {children}
      </>
    );
  }

  return (
    <>
      function {name} returned {children}
    </>
  );
}

interface ConversationMessageType<T, C extends AI.Component<any>> {
  type: T;
  element: AI.Element<AI.PropsOfComponent<C>>;
}

/**
 * A type that represents a conversation message.
 */
export type ConversationMessage =
  | ConversationMessageType<'user', typeof UserMessage>
  | ConversationMessageType<'assistant', typeof AssistantMessage>
  | ConversationMessageType<'system', typeof SystemMessage>
  | ConversationMessageType<'functionCall', typeof FunctionCall>
  | ConversationMessageType<'functionResponse', typeof FunctionResponse>;

/** @hidden */
export function isConversationalComponent(element: AI.Element<any>): boolean {
  return (
    [UserMessage, AssistantMessage, SystemMessage, FunctionCall, FunctionResponse] as AI.Component<any>[]
  ).includes(element.tag);
}

function toConversationMessages(partialRendering: AI.PartiallyRendered[]): ConversationMessage[] {
  return partialRendering
    .flatMap((e) => (AI.isElement(e) ? [e] : []))
    .map<ConversationMessage>((e) => {
      switch (e.tag) {
        case UserMessage:
          return { type: 'user', element: e };
        case AssistantMessage:
          return { type: 'assistant', element: e };
        case SystemMessage:
          return { type: 'system', element: e };
        case FunctionCall:
          return { type: 'functionCall', element: e };
        case FunctionResponse:
          return { type: 'functionResponse', element: e };
        default:
          throw new AIJSXError(
            `Unexpected tag (${e.tag.name}) in conversation`,
            ErrorCode.UnexpectedPartialRenderResult,
            'internal'
          );
      }
    });
}

/** @hidden */
export async function renderToConversation(conversation: AI.Node, render: AI.ComponentContext['render']) {
  return toConversationMessages(await render(conversation, { stop: isConversationalComponent }));
}

/**
 * A component that appends messages to a conversation according to a `reply` function.
 *
 * The `reply` function is invoked with the new messages produced from its _own replies_ until
 * it fails to return a conversational message (e.g. UserMessage or AssistantMessage). The first
 * invocation includes the messages from the `children` prop.
 *
 * @example
 * ```tsx
 *    <Converse reply={function (messages, fullConversation) {
 *        const lastMessage = messages[messages.length - 1];
 *        if (lastMessage.type === "user") {
 *          return (
 *            <ChatCompletion functions={functions}>
 *              {fullConversation.map(msg => msg.element)}
 *            </ChatCompletion>
 *          );
 *        }
 *
 *        if (lastMessage.type === "functionCall") {
 *          return <EvaluateFunction name={lastMessage.element.name} args={lastMessage.element.args} />
 *        }
 *
 *        return null;
 *      }>
 *      <ConversationHistory messages={jsonMessages} />
 *    </ChatCompletion>
 *
 *    ==> 'Hello there!'
 * ```
 *
 */
export async function* Converse(
  {
    reply,
    children,
  }: {
    reply: (messages: ConversationMessage[], fullConversation: ConversationMessage[]) => AI.Renderable;
    children: AI.Node;
  },
  { render, memo }: AI.ComponentContext
): AI.RenderableStream {
  yield AI.AppendOnlyStream;

  const fullConversation = [] as ConversationMessage[];
  let next = memo(children);
  while (true) {
    const newMessages = await renderToConversation(next, render);
    if (newMessages.length === 0) {
      break;
    }

    fullConversation.push(...newMessages);
    next = memo(reply(newMessages, fullConversation.slice()));
    yield next;
  }

  return AI.AppendOnlyStream;
}

/**
 * Allows the presentation of conversational components ({@link UserMessage} et al) to be altered.
 *
 * Also accepts an `onComplete` prop, which will be invoked once per render with the entire conversation.
 *
 * @example
 * ```tsx
 *     <ShowConversation present={(msg) => msg.type === "assistant" && <>Assistant: {msg.element}</>}>
 *         <UserMessage>This is not visible.</UserMessage>
 *         <Assistant>This is visible!</UserMessage>
 *     </ShowConversation>
 *
 *     ==> 'Assistant: This is visible!'
 * ```
 */
export async function* ShowConversation(
  {
    children: children,
    present,
    onComplete,
  }: {
    children: AI.Node;
    present?: (message: ConversationMessage) => AI.Node;
    onComplete?: (conversation: ConversationMessage[], render: AI.RenderContext['render']) => Promise<void> | void;
  },
  { render, isAppendOnlyRender, memo }: AI.ComponentContext
): AI.RenderableStream {
  // If we're in an append-only render, do the transformation in an append-only manner so as not to block.
  if (isAppendOnlyRender) {
    yield AI.AppendOnlyStream;
  }

  let lastFrame = [] as AI.PartiallyRendered[];
  let conversationMessages = [] as ConversationMessage[];

  function handleFrame(frame: AI.PartiallyRendered[]): AI.Node {
    if (isAppendOnlyRender) {
      const delta = toConversationMessages(frame.slice(lastFrame.length));
      conversationMessages = conversationMessages.concat(delta);
      lastFrame = frame;
      return delta.map(present ?? ((m) => m.element));
    }

    conversationMessages = toConversationMessages(frame);
    return toConversationMessages(frame).map(present ?? ((m) => m.element));
  }

  // Memoize before rendering so that the all the conversational components get memoized as well.
  const finalFrame = yield* render(memo(children), {
    map: handleFrame,
    stop: isConversationalComponent,
    appendOnly: isAppendOnlyRender,
  });

  // Prioritize rendering by yielding the final frame before running the `onComplete` handler.
  yield handleFrame(finalFrame);
  await onComplete?.(conversationMessages, render);

  // N.B. This may not have been an append-only stream until now, but by returning this
  // we can indicate that we've already yielded the final frame.
  return AI.AppendOnlyStream;
}
