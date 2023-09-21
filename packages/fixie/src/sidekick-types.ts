import { Jsonifiable } from 'type-fest';
import { FunctionResponse as FunctionResponseNode, FunctionCall as FunctionCallNode } from 'ai-jsx/core/conversation';
import { PropsOfComponent } from 'ai-jsx';

export type MessageGenerationParams = Partial<{
  modelProvider: string | null;
  model: string | null;
  userTimeZoneOffset: number;
}>;

export type AgentId = string;
export type ConversationId = string;
export type Metadata = Record<string, Jsonifiable | undefined>;
export interface MessageRequestParams {
  message: string;
  metadata?: Metadata;
  generationParams: MessageGenerationParams;
}

export interface BaseConversationTurn<Role extends string> {
  role: Role;
  timestamp: number;

  id: string;

  /** Any metadata the client or server would like to attach to the message.
  For instance, the client might include UI state from the host app,
  or the server might include debugging info.
  */
  metadata?: Jsonifiable;

  state: State;
}

export interface UserOrAssistantConversationTurn<Role extends string> extends BaseConversationTurn<Role> {
  messages: Message[];
}

/**
 * Whether the message is being generated, complete, or resulted in an error.
 *
 * When the user is typing or the AI is generating tokens, this will be 'in-progress'.
 *
 * If the backend produces an error while trying to make a response, this will be an Error object.
 *
 * If the user requests that the AI stop generating a message, the state will be 'stopped'.
 */
type State = 'in-progress' | 'done' | 'stopped' | 'error';
export interface StateFields {
  state: State;
  errorDetail?: string;
}

export interface AssistantConversationTurn extends UserOrAssistantConversationTurn<'assistant'>, StateFields {
  /**
   * The user turn that this turn was a reply to.
   */
  inReplyToId: string;
}

export interface UserConversationTurn extends UserOrAssistantConversationTurn<'user'> {}

export type ConversationTurn = AssistantConversationTurn | UserConversationTurn;

/** A message in the conversation. */
export interface BaseMessage extends StateFields {
  /** Any metadata the client or server would like to attach to the message.
      For instance, the client might include UI state from the host app,
      or the server might include debugging info.
  */
  metadata?: Jsonifiable;

  id: string;

  timestamp: number;
}

export interface FunctionCall extends BaseMessage {
  kind: 'functionCall';
  name?: PropsOfComponent<typeof FunctionCallNode>['name'];
  args?: PropsOfComponent<typeof FunctionCallNode>['args'];
}

export interface FunctionResponse extends BaseMessage {
  kind: 'functionResponse';
  name: PropsOfComponent<typeof FunctionResponseNode>['name'];
  response: string;
  failed: PropsOfComponent<typeof FunctionResponseNode>['failed'];
}

export interface TextMessage extends BaseMessage {
  kind: 'text';
  /** The text content of the message. */
  content: string;
}

export type Message = FunctionCall | FunctionResponse | TextMessage;
