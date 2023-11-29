import { Jsonifiable } from 'type-fest';

export interface MessageBase {
  metadata?: Record<string, string | number | boolean | object | null>;
}

export interface FunctionCallMessage extends MessageBase {
  kind: 'functionCall';
  id?: string;
  partial?: boolean;
  name: string;
  args: Record<string, string | number | boolean | null>;
}

export interface FunctionResponseMessage extends MessageBase {
  kind: 'functionResponse';
  id?: string;
  name: string;
  response: string;
  failed: boolean;
}

export interface TextMessage extends MessageBase {
  kind: 'text';
  content: string;
  state?: 'in-progress' | 'done';
}

export type Message = FunctionCallMessage | FunctionResponseMessage | TextMessage;

export interface ConversationTurn {
  id: string;
  timestamp: string;
  role: 'user' | 'assistant';
  messages: Message[];
  state: 'in-progress' | 'done' | 'stopped' | 'error';
  metadata?: Record<string, string | number | boolean | object | null> | null;
  errorDetail?: string | null;
}

export interface InvokeAgentRequest {
  conversationId: string;
  replyToTurnId?: string;
  conversation?: Conversation;
  parameters?: Record<string, Jsonifiable>;
}

export interface InvokeAgentResponse {
  messages: Message[];
  metadata?: Record<string, string | number | boolean | object | null> | null;
  errorDetail: string | null;
}

export interface Conversation {
  id: string;
  turns: ConversationTurn[];
}
