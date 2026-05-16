import { Inject, Injectable } from '@nestjs/common';
import {
  MINIMAX_TEXT_PROVIDER,
  type MiniMaxTextProvider,
} from '../../ai/minimax/minimax.types';
import {
  SceneFragment,
  SceneFragmentSchema,
} from '../../schemas/scene-fragment.schema';
import { TemplatesService } from '../templates/templates.service';
import type { ScenePlan } from './generation-plan.schema';

export interface GeneratedScenePart {
  groupId: string;
  groupLabel: string;
  fragment: SceneFragment;
  source: 'template' | 'model';
}

@Injectable()
export class PartGenerationService {
  constructor(
    private readonly templatesService: TemplatesService,
    @Inject(MINIMAX_TEXT_PROVIDER)
    private readonly textProvider: MiniMaxTextProvider,
  ) {}

  async generateParts(
    prompt: string,
    plan: ScenePlan,
  ): Promise<GeneratedScenePart[]> {
    const parts: GeneratedScenePart[] = [];

    for (const group of plan.entityGroups) {
      const templates = await this.templatesService.searchPublicTemplates(
        group.query,
        2,
      );

      if (templates.length > 0) {
        parts.push({
          groupId: group.id,
          groupLabel: group.label,
          fragment: {
            objects: templates.flatMap((template) => template.fragment.objects),
            lights: templates.flatMap(
              (template) => template.fragment.lights ?? [],
            ),
          },
          source: 'template',
        });
        continue;
      }

      const generated = await this.generateMissingPart(
        prompt,
        plan,
        group.label,
      );

      if (generated) {
        parts.push({
          groupId: group.id,
          groupLabel: group.label,
          fragment: generated,
          source: 'model',
        });
      }
    }

    return parts;
  }

  private async generateMissingPart(
    prompt: string,
    plan: ScenePlan,
    groupLabel: string,
  ): Promise<SceneFragment | undefined> {
    const rawOutput = await this.textProvider.complete({
      messages: [
        {
          role: 'system',
          name: 'MiniMeshPartBuilder',
          content: `Return only valid JSON. Build one compact MiniMesh scene fragment using only primitive objects.
Allowed object types: box, sphere, cylinder, cone, torus, plane.
Return shape: {"objects":[],"lights":[]}. Never return code.`,
        },
        {
          role: 'user',
          name: 'user',
          content: `Original prompt:
${prompt}

Scene style: ${plan.styleKeywords.join(', ')}
Lighting: ${plan.lightingIntent}
Part to build: ${groupLabel}

Create 1 to 8 primitive objects for this part. Use hex colors only.`,
        },
      ],
      maxCompletionTokens: 1800,
      temperature: 0.2,
    });

    try {
      const start = rawOutput.indexOf('{');
      const end = rawOutput.lastIndexOf('}');

      if (start === -1 || end <= start) {
        return undefined;
      }

      return SceneFragmentSchema.parse(
        JSON.parse(rawOutput.slice(start, end + 1)),
      );
    } catch {
      return undefined;
    }
  }
}
