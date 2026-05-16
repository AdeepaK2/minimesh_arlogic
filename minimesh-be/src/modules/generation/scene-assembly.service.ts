import { Injectable } from '@nestjs/common';
import {
  SceneDocument,
  SceneDocumentSchema,
  SceneEntity,
  SceneLightSchema,
  SceneObject,
  SceneObjectSchema,
} from '../../schemas/scene.schema';
import { FALLBACK_LIGHTS } from './generation.prompts';
import type { ScenePlan } from './generation-plan.schema';
import type { GeneratedScenePart } from './part-generation.service';

@Injectable()
export class SceneAssemblyService {
  assemble(plan: ScenePlan, parts: GeneratedScenePart[]): SceneDocument {
    const usedIds = new Set<string>();
    const entities: SceneEntity[] = [];
    const objects = parts
      .flatMap((part) => this.objectsForPart(part, usedIds, entities))
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
      entities: this.entitiesForObjects(entities, objects),
      lights,
      camera: this.cameraFromIntent(plan.cameraIntent),
    });
  }

  private objectsForPart(
    part: GeneratedScenePart,
    usedIds: Set<string>,
    entities: SceneEntity[],
  ): SceneObject[] {
    const entityId = this.uniqueId(
      part.groupId,
      new Set(entities.map((entity) => entity.id)),
      'entity',
    );
    const objects = part.fragment.objects
      .map((object, index) => ({
        ...object,
        id: this.uniqueId(
          object.id,
          usedIds,
          `${entityId}-object-${index + 1}`,
        ),
        entityId,
        role: object.role ?? this.roleFromName(object.name),
      }))
      .map((object) => SceneObjectSchema.safeParse(object))
      .filter((result) => result.success)
      .map((result) => result.data);

    if (objects.length > 0) {
      entities.push({
        id: entityId,
        name: part.groupLabel,
        description: `${part.groupLabel} generated from ${part.source} parts.`,
        sourceGroupId: part.groupId,
        objectIds: objects.map((object) => object.id),
        tags: [part.source, ...this.tagsFromLabel(part.groupLabel)],
        transform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      });
    }

    return objects;
  }

  private entitiesForObjects(
    entities: SceneEntity[],
    objects: SceneObject[],
  ): SceneEntity[] {
    const objectIds = new Set(objects.map((object) => object.id));

    return entities
      .map((entity) => ({
        ...entity,
        objectIds: entity.objectIds.filter((objectId) =>
          objectIds.has(objectId),
        ),
      }))
      .filter((entity) => entity.objectIds.length > 0);
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

  private roleFromName(name: string): string {
    const text = name.toLowerCase();

    if (text.includes('light') || text.includes('glow')) {
      return 'light';
    }

    if (text.includes('wheel') || text.includes('ring')) {
      return 'wheel';
    }

    if (text.includes('body') || text.includes('base')) {
      return 'body';
    }

    if (text.includes('window') || text.includes('panel')) {
      return 'detail';
    }

    return 'part';
  }

  private tagsFromLabel(label: string): string[] {
    return label
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2)
      .slice(0, 5);
  }
}
