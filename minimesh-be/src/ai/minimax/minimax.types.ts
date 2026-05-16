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

export interface MiniMaxUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface MiniMaxCompletion {
  content: string;
  usage?: MiniMaxUsage;
}

export interface MiniMaxTextProvider {
  complete(request: MiniMaxChatRequest): Promise<string>;
  completeWithUsage?(request: MiniMaxChatRequest): Promise<MiniMaxCompletion>;
}

export const MINIMAX_TEXT_PROVIDER = Symbol('MINIMAX_TEXT_PROVIDER');
