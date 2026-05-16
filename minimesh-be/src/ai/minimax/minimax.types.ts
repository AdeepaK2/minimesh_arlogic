export interface MiniMaxMessage {
  role: 'system' | 'user' | 'assistant';
  name?: string;
  content: string;
}

export interface MiniMaxChatRequest {
  messages: MiniMaxMessage[];
  maxCompletionTokens?: number;
  temperature?: number;
}

export interface MiniMaxTextProvider {
  complete(request: MiniMaxChatRequest): Promise<string>;
}

export const MINIMAX_TEXT_PROVIDER = Symbol('MINIMAX_TEXT_PROVIDER');
