import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  MINIMAX_TEXT_PROVIDER,
  type MiniMaxTextProvider,
} from '../../ai/minimax/minimax.types';
import { ScenePlan, ScenePlanSchema } from './generation-plan.schema';

@Injectable()
export class GenerationPlannerService {
  constructor(
    @Inject(MINIMAX_TEXT_PROVIDER)
    private readonly textProvider: MiniMaxTextProvider,
  ) {}

  shouldUsePipeline(prompt: string): boolean {
    const text = prompt.toLowerCase();
    const cueCount = [
      ' with ',
      ' and ',
      ',',
      'street',
      'city',
      'scene',
      'environment',
      'buildings',
      'cinematic',
      'details',
    ].filter((cue) => text.includes(cue)).length;

    return prompt.length > 180 || cueCount >= 3;
  }

  async createPlan(prompt: string): Promise<ScenePlan> {
    const rawOutput = await this.textProvider.complete({
      messages: [
        {
          role: 'system',
          name: 'MiniMeshPlanner',
          content: `Return only valid JSON for a MiniMesh scene plan.
Do not return scene objects yet. Extract reusable entity groups for primitive 3D generation.`,
        },
        {
          role: 'user',
          name: 'user',
          content: `Create a plan for this prompt:

${prompt}

Return this exact JSON shape:
{
  "sceneName": "Short scene name",
  "description": "One sentence scene description",
  "styleKeywords": ["low-poly"],
  "cameraIntent": "cinematic angle focused on main subject",
  "lightingIntent": "blue and pink neon night lighting",
  "maxObjectBudget": 36,
  "entityGroups": [
    {
      "id": "main-subject",
      "label": "Hovering sports car",
      "query": "hovering cyberpunk sports car",
      "priority": 10
    }
  ]
}`,
        },
      ],
      maxCompletionTokens: 1400,
      temperature: 0.15,
    });

    const parsed = this.parsePlan(rawOutput);

    if (parsed) {
      return parsed;
    }

    return this.createHeuristicPlan(prompt);
  }

  private parsePlan(rawOutput: string): ScenePlan | undefined {
    try {
      const start = rawOutput.indexOf('{');
      const end = rawOutput.lastIndexOf('}');

      if (start === -1 || end <= start) {
        return undefined;
      }

      return ScenePlanSchema.parse(JSON.parse(rawOutput.slice(start, end + 1)));
    } catch (error) {
      if (error instanceof z.ZodError || error instanceof SyntaxError) {
        return undefined;
      }

      return undefined;
    }
  }

  private createHeuristicPlan(prompt: string): ScenePlan {
    const lowerPrompt = prompt.toLowerCase();
    const groups = [
      ['vehicle', 'Hovering sports car', 'hover car sports car vehicle'],
      ['road', 'Reflective wet road', 'wet reflective road street'],
      ['buildings', 'Low-poly buildings', 'low poly buildings city blocks'],
      [
        'signs',
        'Neon signs and billboards',
        'neon signs holographic billboards',
      ],
      [
        'lights',
        'Street lamps and light panels',
        'street lamps floating light panels',
      ],
      ['details', 'Street props', 'traffic barriers pipes antennas crates'],
    ]
      .filter(([id, label, query]) =>
        `${id} ${label} ${query}`
          .toLowerCase()
          .split(' ')
          .some((token) => lowerPrompt.includes(token)),
      )
      .map(([id, label, query], index) => ({
        id,
        label,
        query,
        priority: 10 - index,
      }));

    return ScenePlanSchema.parse({
      sceneName: prompt.slice(0, 80) || 'Generated Scene',
      description: prompt.slice(0, 240),
      styleKeywords: ['low-poly'],
      cameraIntent: 'cinematic camera focused on the main subject',
      lightingIntent: lowerPrompt.includes('neon')
        ? 'blue purple and pink neon night lighting'
        : 'balanced scene lighting',
      maxObjectBudget: 36,
      entityGroups:
        groups.length > 0
          ? groups
          : [
              {
                id: 'main-scene',
                label: 'Main scene',
                query: prompt.slice(0, 160),
                priority: 10,
              },
            ],
    });
  }
}
