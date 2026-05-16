import { Injectable } from '@nestjs/common';
import type { MiniMaxMessage } from '../../ai/minimax/minimax.types';
import type { SceneDocument, SceneEntity } from '../../schemas/scene.schema';
import type { ChatContext } from './generation-context.types';
import { TokenUsageService } from './token-usage.service';

export interface BuiltContext {
  contextMessage?: MiniMaxMessage;
  estimatedTokens: number;
}

@Injectable()
export class ContextBuilderService {
  constructor(private readonly tokenUsageService: TokenUsageService) {}

  buildContextMessage(
    context: ChatContext,
    scene?: SceneDocument,
    selectedEntity?: SceneEntity,
  ): BuiltContext {
    const sections: string[] = [];

    if (context?.compactSummary) {
      sections.push(`Compact memory:\n${context.compactSummary}`);
    }

    if (scene) {
      sections.push(this.describeScene(scene));
    }

    if (selectedEntity) {
      sections.push(
        `Selected entity:\n${selectedEntity.name} (${selectedEntity.objectIds.length} objects)\n${selectedEntity.description ?? ''}`,
      );
    } else if (context?.selectedEntityName) {
      sections.push(`Selected entity: ${context.selectedEntityName}`);
    }

    const recentMessages = (context?.recentMessages ?? []).slice(-6);

    if (recentMessages.length > 0) {
      sections.push(
        `Recent chat:\n${recentMessages
          .map((message) => `${message.role}: ${message.content}`)
          .join('\n')}`,
      );
    }

    if (sections.length === 0) {
      return { estimatedTokens: 0 };
    }

    const contextMessage: MiniMaxMessage = {
      role: 'user',
      name: 'user',
      content: `Use this durable MiniMesh chat context. It is background only; obey the latest instruction most strongly.\n\n${sections.join('\n\n')}`,
    };

    return {
      contextMessage,
      estimatedTokens: this.tokenUsageService.estimateMessagesTokens([
        contextMessage,
      ]),
    };
  }

  private describeScene(scene: SceneDocument): string {
    const entityNames = (scene.entities ?? [])
      .slice(0, 12)
      .map((entity) => entity.name)
      .join(', ');

    return `Current scene summary:
Name: ${scene.sceneName}
Description: ${scene.description ?? 'No description'}
Objects: ${scene.objects.length}
Entities: ${entityNames || 'None'}
Lights: ${scene.lights.length}
Camera: position ${scene.camera.position.join(', ')} target ${scene.camera.target.join(', ')}`;
  }
}
