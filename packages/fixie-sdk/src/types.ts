export interface MessageBase {
  metadata?: Record<string, string | number | boolean | object | null>;
}

export interface FunctionCallMessage extends MessageBase {
  kind: 'functionCall';
  name: string;
  args: Record<string, string | number | boolean | null>;
}

export interface FunctionResponseMessage extends MessageBase {
  kind: 'functionResponse';
  name: string;
  response: string;
  failed: boolean;
}

export interface TextMessage extends MessageBase {
  kind: 'text';
  content: string;
}

export type Message = FunctionCallMessage | FunctionResponseMessage | TextMessage;

export interface ConversationTurn {
  id: string;
  timestamp: string;
  role: 'user' | 'assistant';
  messages: Message[];
  state: 'in-progress' | 'done' | 'stopped' | 'error';
  metadata?: Record<string, string | number | boolean | object | null> | null;
  error_detail?: string | null;
}

export interface InvokeAgentRequest {
  conversation_id: string;
  reply_to_turn_id?: string;
}

export interface InvokeAgentResponse {
  messages: Message[];
  metadata?: Record<string, string | number | boolean | object | null> | null;
}

export interface GetConversationResponse {
  id: string;
  turns: ConversationTurn[];
}
