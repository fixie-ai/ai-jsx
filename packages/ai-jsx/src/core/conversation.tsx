import * as AI from '../index.js';
import { Node } from '../index.js';
import { AIJSXError, ErrorCode } from '../core/errors.js';
import { debug } from './debug.js';
import _ from 'lodash';

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

function assertAllElementsAreConversationalComponents(partialRendering: AI.PartiallyRendered[]) {
  const invalidChildren = partialRendering.filter((el) => typeof el === 'string' && el.trim()) as string[];
  if (invalidChildren.length) {
    throw new AIJSXError(
      `Every child of ChatCompletion render to one of: SystemMessage, UserMessage, AssistantMessage, FunctionCall, FunctionResponse. However, some components rendered to bare strings instead. Those strings are: "${invalidChildren.join(
        '", "'
      )}". To fix this, wrap this content in the appropriate child type (e.g. UserMessage).`,
      ErrorCode.ChatCompletionInvalidInput,
      'user',
      {
        invalidChildren,
      }
    );
  }
}

function toConversationMessages(partialRendering: AI.PartiallyRendered[]): ConversationMessage[] {
  assertAllElementsAreConversationalComponents(partialRendering);

  return (partialRendering as AI.Element<any>[]).map<ConversationMessage>((e) => {
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
  const messages = toConversationMessages(await render(conversationToUse, { stop: isConversationalComponent }));

  if (logger && logType) {
    const loggableMessages = await Promise.all(
      messages.map(async (m) => ({
        element: debug(m.element, true),
        ...(cost && { cost: await cost(m, render) }),
      }))
    );

    logger.setAttribute(`ai.jsx.${logType}`, JSON.stringify(loggableMessages));
    logger.info({ [logType]: { messages: loggableMessages } }, `Got ${logType} conversation`);
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
export async function* Converse(
  {
    reply,
    children,
  }: {
    reply: (messages: ConversationMessage[], fullConversation: ConversationMessage[]) => AI.Renderable;
    children: AI.Node;
  },
  { render, memo, logger }: AI.ComponentContext
): AI.RenderableStream {
  yield AI.AppendOnlyStream;

  const fullConversation = [] as ConversationMessage[];
  let next = children;
  while (true) {
    const newMessages = await renderToConversation(next, render, logger);
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
  { render, isAppendOnlyRender }: AI.ComponentContext
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

  const finalFrame = yield* render(children, {
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
  /**
   * We construct a tree of immutable and shrinkable nodes such that shrinkable nodes
   * can contain other nodes.
   */
  type TreeNode = ImmutableTreeNode | ShrinkableTreeNode;

  interface ImmutableTreeNode {
    type: 'immutable';
    element: AI.Element<any>;
    cost: number;
  }

  interface ShrinkableTreeNode {
    type: 'shrinkable';
    element: AI.Element<AI.PropsOfComponent<typeof InternalShrinkable>>;
    cost: number;
    children: TreeNode[];
  }

  /** Converts a conversational `AI.Node` into a shrinkable tree. */
  async function conversationToTreeRoots(conversation: AI.Node): Promise<TreeNode[]> {
    const rendered = await render(conversation, {
      stop: (e) => isConversationalComponent(e) || e.tag === InternalShrinkable,
    });

    assertAllElementsAreConversationalComponents(rendered);

    const asTreeNodes = await Promise.all(
      rendered.map<Promise<TreeNode | null>>(async (value) => {
        if (typeof value === 'string') {
          return null;
        }

        if (value.tag === InternalShrinkable) {
          const children = await conversationToTreeRoots(value.props.children);
          return { type: 'shrinkable', element: value, cost: aggregateCost(children), children };
        }

        return {
          type: 'immutable',
          element: value,
          cost: await costFn(toConversationMessages([value])[0], render),
        };
      })
    );

    return asTreeNodes.filter((n): n is TreeNode => n !== null);
  }

  /** Finds the least important node in any of the trees, considering cost as a second factor. */
  function leastImportantNode(roots: TreeNode[]): ShrinkableTreeNode | undefined {
    function compareImportance(nodeA: ShrinkableTreeNode, nodeB: ShrinkableTreeNode) {
      // If the two nodes are of the same importance, consider the higher cost node less important.
      return nodeA.element.props.importance - nodeB.element.props.importance || nodeB.cost - nodeA.cost;
    }

    let current = undefined as ShrinkableTreeNode | undefined;
    roots.forEach((node) => {
      if (node.type !== 'shrinkable') {
        return;
      }

      if (current === undefined || compareImportance(node, current) < 0) {
        current = node;
      }

      const leastImportantDescendant = leastImportantNode(node.children);
      if (leastImportantDescendant !== undefined && compareImportance(leastImportantDescendant, current) < 0) {
        current = leastImportantDescendant;
      }
    });

    return current;
  }

  function aggregateCost(roots: TreeNode[]): number {
    return _.sumBy(roots, (node) => node.cost);
  }

  /** Replaces a single ShrinkableTreeNode in the tree. */
  async function replaceNode(roots: TreeNode[], nodeToReplace: ShrinkableTreeNode): Promise<TreeNode[]> {
    const newRoots = await Promise.all(
      roots.flatMap<Promise<TreeNode[]>>(async (root) => {
        if (root === nodeToReplace) {
          return conversationToTreeRoots(root.element.props.replacement);
        }

        if (root.type !== 'shrinkable') {
          return [root];
        }

        // Look for a replacement among the children and recalculate the cost.
        const replacementChildren = await replaceNode(root.children, nodeToReplace);
        return [
          {
            type: 'shrinkable',
            element: root.element,
            cost: aggregateCost(replacementChildren),
            children: replacementChildren,
          },
        ];
      })
    );

    return newRoots.flat(1);
  }

  /** Converts the shrinkable tree into a single AI.Node for rendering. */
  function treeRootsToNode(roots: TreeNode[]): AI.Node {
    return roots.map((root) => (root.type === 'immutable' ? root.element : treeRootsToNode(root.children)));
  }

  const rendered = await render(children, {
    stop: (e) => isConversationalComponent(e) || e.tag === InternalShrinkable,
  });

  assertAllElementsAreConversationalComponents(rendered);

  // If there are no shrinkable elements, there's no need to evaluate the cost.
  const shrinkableOrConversationElements = rendered.filter(AI.isElement);
  if (!shrinkableOrConversationElements.find((value) => value.tag === InternalShrinkable)) {
    return shrinkableOrConversationElements;
  }

  let roots = await conversationToTreeRoots(shrinkableOrConversationElements);
  while (aggregateCost(roots) > budget) {
    const nodeToReplace = leastImportantNode(roots);
    if (nodeToReplace === undefined) {
      // Nothing left to replace.
      break;
    }

    logger.debug(
      {
        node: debug(nodeToReplace.element.props.children, true),
        importance: nodeToReplace.element.props.importance,
        replacement: debug(nodeToReplace.element.props.replacement, true),
        nodeCost: nodeToReplace.cost,
        totalCost: aggregateCost(roots),
        budget,
      },
      'Replacing shrinkable content'
    );

    // N.B. This currently quadratic in that each time we replace a node we search the entire
    // tree for the least important node (and then search again to replace it). If we end up
    // doing many replacements we should be smarter about this.
    roots = await replaceNode(roots, nodeToReplace);
  }

  return treeRootsToNode(roots);
}

/**
 * @hidden
 * Indicates that a portion of a conversation is "shrinkable".
 */
export function Shrinkable(
  { children, importance, replacement }: { children: Node; importance: number; replacement?: Node },
  { memo }: AI.ComponentContext
) {
  // We render to a separate component so that:
  //
  // a) The memoization happens in the expected context (that of the <Shrinkable>)
  // b) The memoization can be applied directly to the replacement and children
  //
  // This allows `children` and `replacement` to be taken off the props of <InternalShrinkable>
  // and be correctly memoized, which would not otherwise be the case even if the <Shrinkable>
  // or <InternalShrinkable> were memoized.
  return (
    <InternalShrinkable importance={importance} replacement={replacement && memo(replacement)}>
      {children && memo(children)}
    </InternalShrinkable>
  );
}

/**
 * @hidden
 * An internal component to facilitate prop memoization. See comment in {@link Shrinkable}.
 */
function InternalShrinkable({ children }: { children: Node; importance: number; replacement: Node }) {
  return children;
}
