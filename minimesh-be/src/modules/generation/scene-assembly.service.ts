import { Injectable } from '@nestjs/common';
import {
  SceneDocument,
  SceneDocumentSchema,
  SceneLightSchema,
  SceneObjectSchema,
} from '../../schemas/scene.schema';
import { FALLBACK_LIGHTS } from './generation.prompts';
import type { ScenePlan } from './generation-plan.schema';
import type { GeneratedScenePart } from './part-generation.service';

@Injectable()
export class SceneAssemblyService {
  assemble(plan: ScenePlan, parts: GeneratedScenePart[]): SceneDocument {
    const usedIds = new Set<string>();
    const objects = parts
      .flatMap((part) => part.fragment.objects)
      .map((object, index) => ({
        ...object,
        id: this.uniqueId(object.id, usedIds, `object-${index + 1}`),
      }))
      .map((object) => SceneObjectSchema.safeParse(object))
      .filter((result) => result.success)
      .map((result) => result.data)
      .slice(0, plan.maxObjectBudget);

    const lightIds = new Set<string>();
    const lights = [
      ...parts.flatMap((part) => part.fragment.lights ?? []),
      ...FALLBACK_LIGHTS,
    ]
      .map((light, index) => ({
        ...light,
        id: this.uniqueId(light.id, lightIds, `light-${index + 1}`),
      }))
      .map((light) => SceneLightSchema.safeParse(light))
      .filter((result) => result.success)
      .map((result) => result.data)
      .slice(0, 8);

    return SceneDocumentSchema.parse({
      sceneName: plan.sceneName,
      description: plan.description,
      objects,
      lights,
      camera: this.cameraFromIntent(plan.cameraIntent),
    });
  }

  private uniqueId(
    value: string,
    usedIds: Set<string>,
    fallback: string,
  ): string {
    const base =
      value
        ?.trim()
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 72) || fallback;
    let candidate = base;
    let suffix = 2;

    while (usedIds.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    usedIds.add(candidate);

    return candidate;
  }

  private cameraFromIntent(intent: string): SceneDocument['camera'] {
    const lowerIntent = intent.toLowerCase();

    if (lowerIntent.includes('cinematic') || lowerIntent.includes('angle')) {
      return {
        position: [6, 3.5, 7],
        target: [0, 0.8, 0],
        fov: 45,
      };
    }

    return {
      position: [5, 4, 7],
      target: [0, 0.5, 0],
      fov: 50,
    };
  }
}
