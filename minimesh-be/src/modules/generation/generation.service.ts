import {
  BadGatewayException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { z } from 'zod';
import { MINIMAX_TEXT_PROVIDER } from '../../ai/minimax/minimax.types';
import type { MiniMaxTextProvider } from '../../ai/minimax/minimax.types';
import { SceneDocument, SceneDocumentSchema } from '../../schemas/scene.schema';
import {
  createGenerationUserPrompt,
  createRepairPrompt,
  FALLBACK_LIGHTS,
  SCENE_SYSTEM_PROMPT,
} from './generation.prompts';

export interface GenerateSceneResult {
  scene: SceneDocument;
  warnings: string[];
}

interface ParsedSceneAttempt {
  scene?: SceneDocument;
  errors: string[];
}

@Injectable()
export class GenerationService {
  constructor(
    @Inject(MINIMAX_TEXT_PROVIDER)
    private readonly textProvider: MiniMaxTextProvider,
  ) {}

  async generateScene(prompt: string): Promise<GenerateSceneResult> {
    const rawOutput = await this.textProvider.complete({
      messages: [
        {
          role: 'system',
          name: 'MiniMesh',
          content: SCENE_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          name: 'user',
          content: createGenerationUserPrompt(prompt),
        },
      ],
      maxCompletionTokens: 3000,
      temperature: 0.25,
    });

    const firstAttempt = this.parseAndValidate(rawOutput);

    if (firstAttempt.scene) {
      return {
        scene: this.applyDefaults(firstAttempt.scene),
        warnings: [],
      };
    }

    const repairedOutput = await this.textProvider.complete({
      messages: [
        {
          role: 'system',
          name: 'MiniMesh',
          content: SCENE_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          name: 'user',
          content: createRepairPrompt(rawOutput, firstAttempt.errors),
        },
      ],
      temperature: 0.2,
    });

    const repairAttempt = this.parseAndValidate(repairedOutput);

    if (!repairAttempt.scene) {
      throw new BadGatewayException({
        message: 'MiniMax returned scene JSON that could not be validated.',
        errors: repairAttempt.errors,
      });
    }

    return {
      scene: this.applyDefaults(repairAttempt.scene),
      warnings: ['Initial MiniMax output was repaired before validation.'],
    };
  }

  parseAndValidate(rawOutput: string): ParsedSceneAttempt {
    try {
      const parsed = JSON.parse(this.extractJsonObject(rawOutput)) as unknown;
      const scene = SceneDocumentSchema.parse(parsed);

      return { scene, errors: [] };
    } catch (error) {
      return { errors: this.formatError(error) };
    }
  }

  private extractJsonObject(rawOutput: string): string {
    const fencedMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fencedMatch?.[1]?.trim() ?? rawOutput.trim();

    if (candidate.startsWith('{') && candidate.endsWith('}')) {
      return candidate;
    }

    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      throw new UnprocessableEntityException('No JSON object found in output.');
    }

    return candidate.slice(start, end + 1);
  }

  private formatError(error: unknown): string[] {
    if (error instanceof z.ZodError) {
      return error.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'root';

        return `${path}: ${issue.message}`;
      });
    }

    if (error instanceof Error) {
      return [error.message];
    }

    return ['Unknown validation error.'];
  }

  private applyDefaults(scene: SceneDocument): SceneDocument {
    return {
      ...scene,
      lights: scene.lights.length > 0 ? scene.lights : FALLBACK_LIGHTS,
    };
  }
}
