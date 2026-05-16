import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MiniMaxMessage, MiniMaxUsage } from '../../ai/minimax/minimax.types';
import type { TokenUsage } from './generation-context.types';

@Injectable()
export class TokenUsageService {
  readonly budgetTokens: number;
  readonly compactAtTokens: number;

  constructor(private readonly configService: ConfigService) {
    this.budgetTokens = this.getNumber('CHAT_CONTEXT_TOKEN_BUDGET', 12000);
    this.compactAtTokens = this.getNumber('CHAT_CONTEXT_COMPACT_AT', 9000);
  }

  estimateTextTokens(value: string): number {
    return Math.ceil(value.length / 4);
  }

  estimateMessagesTokens(messages: MiniMaxMessage[]): number {
    return messages.reduce(
      (sum, message) => sum + this.estimateTextTokens(message.content) + 4,
      0,
    );
  }

  createUsage(
    inputMessages: MiniMaxMessage[],
    outputText: string,
    providerUsage?: MiniMaxUsage,
  ): TokenUsage {
    const estimatedInputTokens = this.estimateMessagesTokens(inputMessages);
    const estimatedOutputTokens = this.estimateTextTokens(outputText);
    const inputTokens = providerUsage?.inputTokens ?? estimatedInputTokens;

    return {
      estimatedInputTokens,
      estimatedOutputTokens,
      providerInputTokens: providerUsage?.inputTokens ?? null,
      providerOutputTokens: providerUsage?.outputTokens ?? null,
      contextBudgetTokens: this.budgetTokens,
      contextBudgetPercent: Math.min(
        100,
        Math.round((inputTokens / this.budgetTokens) * 100),
      ),
      usedProviderUsage: Boolean(
        providerUsage?.inputTokens || providerUsage?.outputTokens,
      ),
    };
  }

  shouldCompact(estimatedInputTokens: number): boolean {
    return estimatedInputTokens >= this.compactAtTokens;
  }

  private getNumber(key: string, fallback: number): number {
    const value = Number(this.configService.get<string>(key));

    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}
