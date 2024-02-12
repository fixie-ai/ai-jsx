import * as AI from '../index.js';
import { Node } from '../index.js';
import { AIJSXError, ErrorCode } from '../core/errors.js';
import _ from 'lodash';
import { Jsonifiable } from 'type-fest';

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
export function SystemMessage({ children, metadata }: { children: Node; metadata?: Record<string, Jsonifiable> }) {
  return <system metadata={metadata}>{children}</system>;
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
export function UserMessage({
  name,
  children,
  metadata,
}: {
  name?: string;
  children: Node;
  metadata?: Record<string, Jsonifiable>;
}) {
  return (
    <user name={name} metadata={metadata}>
      {children}
    </user>
  );
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
export function AssistantMessage({ children, metadata }: { children: Node; metadata?: Record<string, Jsonifiable> }) {
  return <assistant metadata={metadata}>{children}</assistant>;
}

/**
 * Sets the node that the <ConversationHistory /> component will resolve to.
 */
export const ConversationHistoryContext = AI.createContext<AI.Node>(undefined);

/**
 * Renders to the conversation history provided through ConversationHistoryContext.
 */
export function ConversationHistory(_: {}, { getContext }: AI.ComponentContext) {
  const fromContext = getContext(ConversationHistoryContext);

  if (fromContext === undefined) {
    throw new AIJSXError(
      'No conversation history was present on the context. Use the ConversationHistoryContext.Provider component to set the conversation history.',
      ErrorCode.ConversationHistoryComponentRequiresContext,
      'user'
    );
  }

  return fromContext;
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
  id,
  name,
  args,
  metadata,
}: {
  name: string;
  id?: string;
  partial?: boolean;
  args: Record<string, string | number | boolean | null>;
  metadata?: Record<string, Jsonifiable>;
}) {
  return (
    <functionCall id={id} name={name} metadata={metadata}>
      {JSON.stringify(args)}
    </functionCall>
  );
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
export function FunctionResponse({
  id,
  name,
  children,
  metadata,
}: {
  id?: string;
  name: string;
  failed?: boolean;
  children: Node;
  metadata?: Record<string, Jsonifiable>;
}) {
  return (
    <functionResponse id={id} name={name} metdata={metadata}>
      {children}
    </functionResponse>
  );
}

/**
 * A type that represents a conversation message.
 */
export type ConversationMessage =
  | AI.RenderedIntrinsicElement<'user'>
  | AI.RenderedIntrinsicElement<'assistant'>
  | AI.RenderedIntrinsicElement<'system'>
  | AI.RenderedIntrinsicElement<'functionCall'>
  | AI.RenderedIntrinsicElement<'functionResponse'>;

export const isConversationMessage = (element: AI.RenderElement): element is ConversationMessage =>
  element.type in ['user', 'assistant', 'system', 'functionCall', 'functionResponse'];

export async function toConversationMessages(renderElement: AI.RenderElement) {
  const messages: ConversationMessage[] = [];
  for await (const [message, _] of AI.traverse(renderElement, {
    yield: isConversationMessage,
    descend: (e) => !isConversationMessage(e),
  })) {
    messages.push(message);
  }

  await Promise.all(messages.map((message) => message.untilComplete()));
  return messages;
}

/** @hidden */
export async function renderToConversation(
  conversation: AI.Node,
  render: AI.ComponentContext['render'],
  logger?: AI.ComponentContext['logger'],
  logType?: 'prompt' | 'completion',
  cost?: (message: ConversationMessage, render: AI.ComponentContext['render']) => Promise<number>,
  budget?: number
) {
  const conversationToUse =
    cost && budget ? (
      <ShrinkConversation cost={cost} budget={budget}>
        {conversation}
      </ShrinkConversation>
    ) : (
      conversation
    );
  const messages = await toConversationMessages(render(conversationToUse));
  if (logger && logType) {
    logger.info({ [logType]: { messages } }, `Got ${logType} conversation`);
  }

  return messages;
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
 *      <ConversationHistory />
 *    </ChatCompletion>
 *
 *    ==> 'Hello there!'
 * ```
 *
 */
export function Converse({
  reply,
  children,
}: {
  reply: (messages: ConversationMessage[], fullConversation: ConversationMessage[]) => AI.Renderable;
  children: AI.Node;
}) {
  // Keep producing rounds until there's a round with no messages.
  async function ConversationRound(
    { currentRound, history }: { currentRound: AI.Node; history: ConversationMessage[] },
    { render }: AI.ComponentContext
  ) {
    const currentRoundMessages = await renderToConversation(currentRound, render);
    if (currentRoundMessages.length === 0) {
      return;
    }

    const newHistory = history.concat(currentRoundMessages);
    const nextRound = render(reply(currentRoundMessages, newHistory.slice()));
    return [nextRound, <ConversationRound history={newHistory} currentRound={nextRound} />];
  }

  return <ConversationRound history={[]} currentRound={children} />;
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
 *         <AssistantMessage>This is visible!</AssistantMessage>
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
    present?: (message: ConversationMessage, index: number) => AI.Node;
    onComplete?: (conversation: ConversationMessage[], render: AI.RenderContext['render']) => Promise<void> | void;
  },
  { render }: AI.ComponentContext
) {
  let index = 0;
  const renderedChildren = render(children);
  if (present) {
    for await (const [message, _] of AI.traverse(renderedChildren, {
      yield: isConversationMessage,
      descend: () => !isConversationMessage,
    })) {
      yield present(message, index);
      index++;
    }
  }

  await onComplete?.(await toConversationMessages(renderedChildren), render);
}

/**
 * @hidden
 * "Shrinks" a conversation messages according to a cost function (e.g. token length),
 * a budget (e.g. context window size), and the `importance` prop set on any `<Shrinkable>`
 * components within the conversation.
 *
 * Currently, `<Shrinkable>` components must wrap conversational components and do not allow
 * content to shrink _within_ conversational components. For example this:
 *
 * @example
 * ```tsx
 *    // Do not do this!
 *    <UserMessage>
 *      Content
 *      <Shrinkable importance={0}>Not shrinkable!</Shrinkable>
 *      Content
 *    </UserMessage>
 * ```
 *
 * is not shrinkable. Instead, do this:
 *
 * * @example
 * ```tsx
 *    <Shrinkable importance={0} replacement={<UserMessage>Content Content</UserMessage>}>
 *      <UserMessage>
 *        Content
 *        Shrinkable!
 *        Content
 *      </UserMessage
 *    </Shrinkable>
 * ```
 */
export async function ShrinkConversation(
  {
    cost: costFn,
    budget,
    children,
  }: {
    cost: (message: ConversationMessage, render: AI.RenderContext['render']) => Promise<number>;
    budget: number;
    children: Node;
  },
  { render, logger }: AI.ComponentContext
) {
  let currentTree: AI.RenderElement = render(children);

  // Cache the costs of each message to avoid recalculating them on each iteration.
  const costCache = new Map<AI.RenderElement, number>();

  while (true) {
    // Calculate the cost of the current tree.
    const messages = await toConversationMessages(currentTree);
    const costPromises = messages.map(async (message) => {
      if (!costCache.has(message)) {
        costCache.set(message, await costFn(message, render));
      }

      return costCache.get(message)!;
    });
    const cost = (await Promise.all(costPromises)).reduce((a, b) => a + b, 0);

    if (cost <= budget) {
      // If the cost doesn't surprass the budget, we're done.
      return currentTree;
    }

    // Find the least important node in the tree.
    let leastImportantNodeAndPath: [AI.RenderedIntrinsicElement<'shrinkable'>, AI.RenderElement[]] | undefined =
      undefined;
    for await (const [node, path] of AI.traverse(currentTree, {
      yield: (e): e is AI.RenderedIntrinsicElement<'shrinkable'> => e.type === 'shrinkable',
      descend: () => true,
    })) {
      if (
        leastImportantNodeAndPath === undefined ||
        node.attributes.importance < leastImportantNodeAndPath[0].attributes.importance
      ) {
        // TODO: Consider using cost as a second factor for importance.
        leastImportantNodeAndPath = [node, path];
      }
    }

    if (leastImportantNodeAndPath === undefined) {
      // If there are no shrinkable nodes, we're done.
      return currentTree;
    }

    const [nodeToReplace, path] = leastImportantNodeAndPath;

    // Replace the least important node with its replacement.
    logger.debug(
      {
        nodeToReplace,
        totalCost: cost,
        budget,
      },
      'Replacing shrinkable content'
    );
    currentTree = AI.replaceSubtree(currentTree, path, (node) =>
      node === nodeToReplace ? nodeToReplace.renderContext.render(nodeToReplace.attributes.replacement) : node
    );
  }
}

/**
 * @hidden
 * Indicates that a portion of a conversation is "shrinkable".
 */
export function Shrinkable({
  children,
  importance,
  replacement,
}: {
  children: Node;
  importance: number;
  replacement?: Node;
}) {
  return (
    <shrinkable importance={importance} replacement={replacement}>
      {children}
    </shrinkable>
  );
}
