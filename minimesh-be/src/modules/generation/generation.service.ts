import {
  BadGatewayException,
  Inject,
  Injectable,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import { z } from 'zod';
import { MINIMAX_TEXT_PROVIDER } from '../../ai/minimax/minimax.types';
import type { MiniMaxTextProvider } from '../../ai/minimax/minimax.types';
import {
  SceneDocument,
  SceneDocumentSchema,
  SceneObjectSchema,
} from '../../schemas/scene.schema';
import type { SceneEntity, SceneObject } from '../../schemas/scene.schema';
import {
  createGenerationUserPrompt,
  createRepairPrompt,
  FALLBACK_LIGHTS,
  SCENE_SYSTEM_PROMPT,
} from './generation.prompts';
import { GenerationPlannerService } from './generation-planner.service';
import { LightingAgentService } from './lighting-agent.service';
import { PartGenerationService } from './part-generation.service';
import { SceneAssemblyService } from './scene-assembly.service';

export interface GenerateSceneResult {
  scene: SceneDocument;
  warnings: string[];
}

interface ParsedSceneAttempt {
  scene?: SceneDocument;
  errors: string[];
}

const EntityRefinementOutputSchema = z.object({
  objects: z.array(SceneObjectSchema).min(1).max(24),
  warnings: z.array(z.string().max(200)).max(8).default([]),
});

@Injectable()
export class GenerationService {
  constructor(
    @Inject(MINIMAX_TEXT_PROVIDER)
    private readonly textProvider: MiniMaxTextProvider,
    @Optional()
    private readonly plannerService?: GenerationPlannerService,
    @Optional()
    private readonly partGenerationService?: PartGenerationService,
    @Optional()
    private readonly sceneAssemblyService?: SceneAssemblyService,
    @Optional()
    private readonly lightingAgentService?: LightingAgentService,
  ) {}

  async generateScene(prompt: string): Promise<GenerateSceneResult> {
    if (this.shouldUsePartPipeline(prompt)) {
      const pipelineResult = await this.tryGenerateSceneWithParts(prompt);

      if (pipelineResult) {
        return pipelineResult;
      }
    }

    return this.generateSceneDirectly(prompt);
  }

  async editScene(
    scene: SceneDocument,
    instruction: string,
  ): Promise<GenerateSceneResult> {
    const trustedScene = this.ensureEntities(SceneDocumentSchema.parse(scene));
    const rawOutput = await this.textProvider.complete({
      messages: [
        {
          role: 'system',
          name: 'MiniMeshSceneEditor',
          content: `${SCENE_SYSTEM_PROMPT}

You are editing an existing MiniMesh SceneDocument.
Return the full updated scene JSON, not a patch.
Preserve ids for unchanged objects, entities, and lights.
Preserve unrelated entities unless the user clearly asks to remove or replace them.
If the input scene contains entities or environment, include valid updated entities or environment when useful.
Never return code or markdown.`,
        },
        {
          role: 'user',
          name: 'user',
          content: `Current scene:
${JSON.stringify(trustedScene, null, 2)}

Instruction:
${instruction}

Return only the complete updated MiniMesh scene JSON.`,
        },
      ],
      maxCompletionTokens: 5200,
      temperature: 0.2,
    });
    const firstAttempt = this.parseAndValidate(rawOutput);

    if (firstAttempt.scene) {
      return {
        scene: this.applyVisualDefaults(instruction, firstAttempt.scene),
        warnings: ['Edited scene from chat.'],
      };
    }

    const repairedOutput = await this.textProvider.complete({
      messages: [
        {
          role: 'system',
          name: 'MiniMeshSceneEditor',
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
        message: 'MiniMax returned edited scene JSON that could not be validated.',
        errors: repairAttempt.errors,
      });
    }

    return {
      scene: this.applyVisualDefaults(instruction, repairAttempt.scene),
      warnings: [
        'Edited scene from chat.',
        'Initial MiniMax edit output was repaired before validation.',
      ],
    };
  }

  async refineEntity(
    scene: SceneDocument,
    entityId: string,
    instruction: string,
  ): Promise<GenerateSceneResult> {
    const trustedScene = this.ensureEntities(SceneDocumentSchema.parse(scene));
    const entity = trustedScene.entities?.find((item) => item.id === entityId);

    if (!entity) {
      throw new BadGatewayException({
        message: 'Selected entity was not found in the scene.',
      });
    }

    const selectedObjectIds = new Set(entity.objectIds);
    const selectedObjects = trustedScene.objects.filter((object) =>
      selectedObjectIds.has(object.id),
    );
    const rawOutput = await this.textProvider.complete({
      messages: [
        {
          role: 'system',
          name: 'MiniMeshEntityRefiner',
          content: `Return only valid JSON. Refine only the selected MiniMesh entity.
Allowed object types: box, sphere, cylinder, cone, torus, plane.
Preserve every selected object's id and entityId. Never return code.`,
        },
        {
          role: 'user',
          name: 'user',
          content: `Selected entity:
${JSON.stringify(entity, null, 2)}

Selected objects:
${JSON.stringify(selectedObjects, null, 2)}

Instruction:
${instruction}

Return this exact shape:
{
  "objects": [updated selected objects only],
  "warnings": []
}`,
        },
      ],
      maxCompletionTokens: 3200,
      temperature: 0.2,
    });
    const refinement = this.parseEntityRefinement(rawOutput, selectedObjectIds);
    const updatedById = new Map(
      refinement.objects.map((object) => [
        object.id,
        {
          ...object,
          entityId,
        },
      ]),
    );
    const updatedScene = SceneDocumentSchema.parse({
      ...trustedScene,
      objects: trustedScene.objects.map(
        (object) => updatedById.get(object.id) ?? object,
      ),
    });

    return {
      scene: this.applyVisualDefaults(instruction, updatedScene),
      warnings: ['Refined selected entity.', ...refinement.warnings].slice(
        0,
        8,
      ),
    };
  }

  private async generateSceneDirectly(
    prompt: string,
  ): Promise<GenerateSceneResult> {
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
      maxCompletionTokens: 5000,
      temperature: 0.25,
    });

    const firstAttempt = this.parseAndValidate(rawOutput);

    if (firstAttempt.scene) {
      return {
        scene: this.applyVisualDefaults(prompt, firstAttempt.scene),
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
      scene: this.applyVisualDefaults(prompt, repairAttempt.scene),
      warnings: ['Initial MiniMax output was repaired before validation.'],
    };
  }

  private shouldUsePartPipeline(prompt: string): boolean {
    return Boolean(
      this.plannerService &&
      this.partGenerationService &&
      this.sceneAssemblyService &&
      this.plannerService.shouldUsePipeline(prompt),
    );
  }

  private async tryGenerateSceneWithParts(
    prompt: string,
  ): Promise<GenerateSceneResult | undefined> {
    try {
      const plan = await this.plannerService?.createPlan(prompt);

      if (!plan) {
        return undefined;
      }

      const parts = await this.partGenerationService?.generateParts(
        prompt,
        plan,
      );

      if (!parts || parts.length === 0) {
        return undefined;
      }

      const scene = this.sceneAssemblyService?.assemble(plan, parts);

      if (!scene) {
        return undefined;
      }
      const litScene =
        this.lightingAgentService?.enhanceScene(prompt, plan, scene) ?? scene;

      return {
        scene: this.applyDefaults(litScene),
        warnings: ['Generated with template-assisted multi-part pipeline.'],
      };
    } catch {
      return undefined;
    }
  }

  parseAndValidate(rawOutput: string): ParsedSceneAttempt {
    try {
      const parsed = JSON.parse(this.extractJsonObject(rawOutput)) as unknown;
      const normalized = this.normalizeSceneDocument(parsed);
      const scene = SceneDocumentSchema.parse(normalized);

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
    const sceneWithEntities = this.ensureEntities(scene);

    return {
      ...sceneWithEntities,
      lights:
        sceneWithEntities.lights.length > 0
          ? sceneWithEntities.lights
          : FALLBACK_LIGHTS,
    };
  }

  private applyVisualDefaults(
    prompt: string,
    scene: SceneDocument,
  ): SceneDocument {
    const sceneWithLights = this.applyDefaults(scene);

    return (
      this.lightingAgentService?.enhanceIfNeeded(prompt, sceneWithLights) ??
      sceneWithLights
    );
  }

  private normalizeSceneDocument(value: unknown): unknown {
    if (!this.isRecord(value)) {
      return value;
    }

    const objects = Array.isArray(value.objects)
      ? value.objects
          .slice(0, 60)
          .map((object, index) => this.normalizeSceneObject(object, index))
      : value.objects;
    const lights = Array.isArray(value.lights)
      ? value.lights
          .slice(0, 8)
          .map((light, index) => this.normalizeSceneLight(light, index))
      : value.lights;

    return {
      ...value,
      sceneName:
        typeof value.sceneName === 'string' && value.sceneName.trim()
          ? value.sceneName
          : 'Generated Scene',
      objects,
      lights,
      camera: this.normalizeCamera(value.camera),
    };
  }

  private normalizeSceneObject(value: unknown, index: number): unknown {
    if (!this.isRecord(value)) {
      return value;
    }

    const name = this.toStringValue(value.name, `Object ${index + 1}`);
    const sourceType = this.toStringValue(value.type, name);
    const material = this.isRecord(value.material) ? value.material : {};

    return {
      ...value,
      id: this.toSafeId(value.id, `object-${index + 1}`),
      name,
      entityId:
        typeof value.entityId === 'string'
          ? this.toSafeId(value.entityId, `entity-${index + 1}`)
          : undefined,
      role:
        typeof value.role === 'string' && value.role.trim()
          ? value.role.trim().slice(0, 80)
          : undefined,
      type: this.normalizeObjectType(sourceType, name),
      position: this.normalizeVector(value.position, [0, 0, 0]),
      rotation: this.normalizeVector(value.rotation, [0, 0, 0]),
      scale: this.normalizeScale(value.scale),
      material: {
        color: this.normalizeColor(material.color),
        metalness: this.normalizeUnit(material.metalness),
        roughness: this.normalizeUnit(material.roughness, 0.55),
        emissive:
          typeof material.emissive === 'string'
            ? this.normalizeColor(material.emissive)
            : undefined,
        emissiveIntensity:
          material.emissiveIntensity === undefined
            ? undefined
            : this.normalizeNumber(material.emissiveIntensity, 0, 0, 5),
      },
      animation: this.normalizeAnimation(value.animation),
    };
  }

  private normalizeSceneLight(value: unknown, index: number): unknown {
    if (!this.isRecord(value)) {
      return value;
    }

    const sourceType = this.toStringValue(value.type, 'point').toLowerCase();
    const type = sourceType.includes('ambient')
      ? 'ambient'
      : sourceType.includes('directional') || sourceType.includes('sun')
        ? 'directional'
        : 'point';

    return {
      ...value,
      id: this.toSafeId(value.id, `light-${index + 1}`),
      type,
      color: this.normalizeColor(value.color, '#ffffff'),
      intensity: this.normalizeNumber(value.intensity, 1, 0, 10),
      position:
        type === 'ambient'
          ? undefined
          : this.normalizeVector(value.position, [4, 5, 4]),
    };
  }

  private normalizeCamera(value: unknown): unknown {
    if (!this.isRecord(value)) {
      return value;
    }

    return {
      ...value,
      position: this.normalizeVector(value.position, [5, 4, 7]),
      target: this.normalizeVector(value.target, [0, 0.5, 0]),
      fov: this.normalizeNumber(value.fov, 45, 25, 90),
    };
  }

  private parseEntityRefinement(
    rawOutput: string,
    allowedObjectIds: Set<string>,
  ): z.infer<typeof EntityRefinementOutputSchema> {
    try {
      const parsed = JSON.parse(this.extractJsonObject(rawOutput)) as unknown;
      const refinement = EntityRefinementOutputSchema.parse(parsed);
      const invalidObject = refinement.objects.find(
        (object) => !allowedObjectIds.has(object.id),
      );

      if (invalidObject) {
        throw new Error(
          `Refinement tried to update an object outside the selected entity: ${invalidObject.id}`,
        );
      }

      return refinement;
    } catch (error) {
      throw new BadGatewayException({
        message:
          'MiniMax returned entity refinement JSON that could not be validated.',
        errors: this.formatError(error),
      });
    }
  }

  private ensureEntities(scene: SceneDocument): SceneDocument {
    if (scene.entities && scene.entities.length > 0) {
      const entityIds = new Set(scene.entities.map((entity) => entity.id));

      return {
        ...scene,
        objects: scene.objects.map((object) =>
          object.entityId && entityIds.has(object.entityId)
            ? object
            : {
                ...object,
                entityId: object.entityId ?? object.id,
              },
        ),
      };
    }

    const entities: SceneEntity[] = scene.objects.map((object) => ({
      id: object.id,
      name: object.name,
      description: `${object.name} generated as a selectable scene entity.`,
      sourceGroupId: object.id,
      objectIds: [object.id],
      tags: [object.type],
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    }));

    return SceneDocumentSchema.parse({
      ...scene,
      objects: scene.objects.map((object) => ({
        ...object,
        entityId: object.entityId ?? object.id,
        role: object.role ?? object.type,
      })),
      entities,
    });
  }

  private normalizeObjectType(type: string, name: string): SceneObject['type'] {
    const text = `${type} ${name}`.toLowerCase();

    if (
      text.includes('road') ||
      text.includes('floor') ||
      text.includes('ground')
    ) {
      return 'plane';
    }

    if (
      /\bwheel\b/.test(text) ||
      /\bring\b/.test(text) ||
      /\btire\b/.test(text)
    ) {
      return 'torus';
    }

    if (
      text.includes('pipe') ||
      text.includes('pole') ||
      text.includes('lamp') ||
      text.includes('antenna') ||
      text.includes('cylinder')
    ) {
      return 'cylinder';
    }

    if (text.includes('cone')) {
      return 'cone';
    }

    if (
      text.includes('sphere') ||
      text.includes('orb') ||
      text.includes('ball') ||
      text.includes('light')
    ) {
      return 'sphere';
    }

    if (
      text.includes('panel') ||
      text.includes('sign') ||
      text.includes('billboard') ||
      text.includes('screen')
    ) {
      return 'plane';
    }

    return 'box';
  }

  private normalizeAnimation(value: unknown): unknown {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const allowed = new Set([
      'rotate',
      'move',
      'bounce',
      'pulse',
      'orbit',
      'open_close',
    ]);
    const type = this.toStringValue(value.type, '');

    if (!allowed.has(type)) {
      return undefined;
    }

    return {
      type,
      axis: ['x', 'y', 'z'].includes(this.toStringValue(value.axis, ''))
        ? value.axis
        : undefined,
      speed: this.normalizeNumber(value.speed, 1, 0.01, 10),
      loop: typeof value.loop === 'boolean' ? value.loop : true,
      target: typeof value.target === 'string' ? value.target : undefined,
    };
  }

  private normalizeColor(value: unknown, fallback = '#38bdf8'): string {
    if (typeof value !== 'string') {
      return fallback;
    }

    if (/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value)) {
      return value;
    }

    const namedColors: Record<string, string> = {
      amber: '#f59e0b',
      black: '#111111',
      blue: '#38bdf8',
      cyan: '#22d3ee',
      green: '#22c55e',
      grey: '#64748b',
      gray: '#64748b',
      magenta: '#d946ef',
      neonblue: '#00d5ff',
      neonpink: '#ff2bd6',
      neonpurple: '#a855f7',
      orange: '#f97316',
      pink: '#ec4899',
      purple: '#8b5cf6',
      red: '#ef4444',
      white: '#f8fafc',
      yellow: '#facc15',
    };
    const key = value.toLowerCase().replace(/[^a-z]/g, '');

    return namedColors[key] ?? fallback;
  }

  private normalizeScale(value: unknown): [number, number, number] {
    return this.normalizeVector(value, [1, 1, 1]).map((item) =>
      Math.max(0.01, Math.abs(item)),
    ) as [number, number, number];
  }

  private normalizeVector(
    value: unknown,
    fallback: [number, number, number],
  ): [number, number, number] {
    if (!Array.isArray(value)) {
      return fallback;
    }

    return [
      this.normalizeNumber(value[0], fallback[0]),
      this.normalizeNumber(value[1], fallback[1]),
      this.normalizeNumber(value[2], fallback[2]),
    ];
  }

  private normalizeUnit(value: unknown, fallback = 0): number {
    return this.normalizeNumber(value, fallback, 0, 1);
  }

  private normalizeNumber(
    value: unknown,
    fallback: number,
    min?: number,
    max?: number,
  ): number {
    const number =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : Number.NaN;

    if (!Number.isFinite(number)) {
      return fallback;
    }

    return Math.min(max ?? number, Math.max(min ?? number, number));
  }

  private toSafeId(value: unknown, fallback: string): string {
    const text = this.toStringValue(value, fallback)
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);

    return text || fallback;
  }

  private toStringValue(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
