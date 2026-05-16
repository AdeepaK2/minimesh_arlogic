import { Injectable } from '@nestjs/common';
import {
  SceneDocument,
  SceneDocumentSchema,
  SceneEntity,
  SceneObject,
} from '../../schemas/scene.schema';

interface SceneScaleContext {
  batLength?: number;
}

@Injectable()
export class ScaleAgentService {
  enhance(scene: SceneDocument): SceneDocument {
    const context = this.createScaleContext(scene);

    if (!context.batLength) {
      return scene;
    }

    return SceneDocumentSchema.parse({
      ...scene,
      objects: scene.objects.map((object) =>
        this.adjustObjectScale(object, scene.entities ?? [], context),
      ),
    });
  }

  private createScaleContext(scene: SceneDocument): SceneScaleContext {
    const batObjects = scene.objects.filter((object) =>
      this.isBatObject(object, scene.entities ?? []),
    );

    if (batObjects.length === 0) {
      return {};
    }

    return {
      batLength: Math.max(
        ...batObjects.map((object) => Math.max(...object.scale)),
      ),
    };
  }

  private adjustObjectScale(
    object: SceneObject,
    entities: SceneEntity[],
    context: SceneScaleContext,
  ): SceneObject {
    if (!context.batLength || !Number.isFinite(context.batLength)) {
      return object;
    }

    const text = this.getObjectText(object, entities);

    if (this.hasAny(text, ['bail', 'crossbar'])) {
      return this.adjustBailScale(object, context.batLength);
    }

    if (this.hasAny(text, ['wicket', 'stump'])) {
      return this.adjustVerticalEquipmentScale(object, context.batLength);
    }

    if (
      object.type === 'sphere' &&
      this.hasAny(text, ['cricket ball', 'red ball', 'ball'])
    ) {
      return this.adjustBallScale(object, context.batLength);
    }

    return object;
  }

  private adjustVerticalEquipmentScale(
    object: SceneObject,
    batLength: number,
  ): SceneObject {
    const targetHeight = this.clamp(batLength * 0.62, 0.85, 3.2);
    const currentHeight = object.scale[1];

    if (currentHeight >= targetHeight * 0.75) {
      return this.liftVerticalObjectToGround(object);
    }

    const factor = this.clamp(targetHeight / Math.max(currentHeight, 0.01), 1, 6);
    const nextScale: [number, number, number] = [
      object.scale[0] * factor,
      object.scale[1] * factor,
      object.scale[2] * factor,
    ];

    return this.liftVerticalObjectToGround({
      ...object,
      scale: nextScale,
    });
  }

  private adjustBailScale(object: SceneObject, batLength: number): SceneObject {
    const targetLength = this.clamp(batLength * 0.22, 0.28, 1);
    const currentLength = Math.max(object.scale[0], object.scale[2]);

    if (currentLength >= targetLength * 0.7) {
      return object;
    }

    const factor = this.clamp(targetLength / Math.max(currentLength, 0.01), 1, 3);

    return {
      ...object,
      scale: [
        object.scale[0] * factor,
        object.scale[1] * factor,
        object.scale[2] * factor,
      ],
    };
  }

  private adjustBallScale(object: SceneObject, batLength: number): SceneObject {
    const targetDiameter = this.clamp(batLength * 0.16, 0.25, 0.75);
    const currentDiameter = Math.max(...object.scale);

    if (
      currentDiameter >= targetDiameter * 0.65 &&
      currentDiameter <= targetDiameter * 1.8
    ) {
      return object;
    }

    const factor = this.clamp(
      targetDiameter / Math.max(currentDiameter, 0.01),
      0.35,
      2.5,
    );

    return {
      ...object,
      scale: [
        object.scale[0] * factor,
        object.scale[1] * factor,
        object.scale[2] * factor,
      ],
    };
  }

  private liftVerticalObjectToGround(object: SceneObject): SceneObject {
    if (!['box', 'cylinder', 'cone'].includes(object.type)) {
      return object;
    }

    return {
      ...object,
      position: [
        object.position[0],
        Math.max(object.position[1], object.scale[1] / 2),
        object.position[2],
      ],
    };
  }

  private isBatObject(object: SceneObject, entities: SceneEntity[]): boolean {
    const text = this.getObjectText(object, entities);

    if (this.hasAny(text, ['ball', 'wicket', 'stump', 'bail'])) {
      return false;
    }

    return this.hasAny(text, ['cricket bat', 'bat blade', 'bat handle', 'grip']);
  }

  private getObjectText(
    object: SceneObject,
    entities: SceneEntity[],
  ): string {
    const entity = entities.find((item) => item.id === object.entityId);

    return `${object.id} ${object.name} ${object.role ?? ''} ${entity?.name ?? ''} ${entity?.description ?? ''} ${(entity?.tags ?? []).join(' ')}`.toLowerCase();
  }

  private hasAny(text: string, terms: string[]): boolean {
    return terms.some((term) => text.includes(term));
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
