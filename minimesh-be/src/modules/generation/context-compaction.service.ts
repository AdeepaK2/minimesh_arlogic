import { Inject, Injectable } from '@nestjs/common';
import {
  MINIMAX_TEXT_PROVIDER,
  type MiniMaxTextProvider,
} from '../../ai/minimax/minimax.types';
import type { SceneDocument, SceneEntity } from '../../schemas/scene.schema';
import type { ChatContext } from './generation-context.types';
import { ContextBuilderService } from './context-builder.service';
import { TokenUsageService } from './token-usage.service';

export interface CompactionResult {
  context: ChatContext;
  didCompact: boolean;
  compactSummary?: string | null;
  compactedAt?: string | null;
}

@Injectable()
export class ContextCompactionService {
  constructor(
    @Inject(MINIMAX_TEXT_PROVIDER)
    private readonly textProvider: MiniMaxTextProvider,
    private readonly contextBuilderService: ContextBuilderService,
    private readonly tokenUsageService: TokenUsageService,
  ) {}

  async compactIfNeeded(
    context: ChatContext,
    scene?: SceneDocument,
    selectedEntity?: SceneEntity,
  ): Promise<CompactionResult> {
    const builtContext = this.contextBuilderService.buildContextMessage(
      context,
      scene,
      selectedEntity,
    );

    if (!this.tokenUsageService.shouldCompact(builtContext.estimatedTokens)) {
      return {
        context,
        didCompact: false,
        compactSummary: context?.compactSummary ?? null,
        compactedAt: null,
      };
    }

    const rawSummary = await this.textProvider.complete({
      messages: [
        {
          role: 'system',
          name: 'MiniMeshMemoryCompactor',
          content:
            'Summarize MiniMesh chat memory. Return plain text only. Preserve durable user intent, style preferences, scene decisions, constraints, selected entities, and unresolved requests. Do not include JSON.',
        },
        {
          role: 'user',
          name: 'memory',
          content: builtContext.contextMessage?.content ?? '',
        },
      ],
      maxCompletionTokens: 700,
      temperature: 0.1,
    });
    const compactSummary = rawSummary.trim().slice(0, 4000);
    const compactedAt = new Date().toISOString();

    return {
      context: {
        ...context,
        compactSummary,
        recentMessages: (context?.recentMessages ?? []).slice(-2),
      },
      didCompact: true,
      compactSummary,
      compactedAt,
    };
  }
}
