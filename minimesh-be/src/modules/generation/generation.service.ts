import {
  BadGatewayException,
  Inject,
  Injectable,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import { z } from 'zod';
import { MINIMAX_TEXT_PROVIDER } from '../../ai/minimax/minimax.types';
import type {
  MiniMaxChatRequest,
  MiniMaxCompletion,
  MiniMaxMessage,
  MiniMaxTextProvider,
} from '../../ai/minimax/minimax.types';
import {
  SceneDocument,
  SceneDocumentSchema,
  SceneObjectSchema,
} from '../../schemas/scene.schema';
import type { SceneEntity, SceneObject } from '../../schemas/scene.schema';
import {
  createGenerationUserPrompt,
  createRepairPrompt,
  createSpatialRepairPrompt,
  FALLBACK_LIGHTS,
  SCENE_SYSTEM_PROMPT,
} from './generation.prompts';
import { ContextBuilderService } from './context-builder.service';
import { ContextCompactionService } from './context-compaction.service';
import type {
  ChatContext,
  GenerationUsage,
} from './generation-context.types';
import { GenerationPlannerService } from './generation-planner.service';
import { LightingAgentService } from './lighting-agent.service';
import { PartGenerationService } from './part-generation.service';
import { ScaleAgentService } from './scale-agent.service';
import { SceneAssemblyService } from './scene-assembly.service';
import { TemplatesService } from '../templates/templates.service';
import { TokenUsageService } from './token-usage.service';

export interface GenerateSceneResult {
  scene: SceneDocument;
  warnings: string[];
  usage?: GenerationUsage;
}

export interface ClarificationOption {
  id: string;
  label: string;
  resolvedPrompt: string;
}

export type GenerationClarificationResult =
  | {
      status: 'ready';
      resolvedPrompt: string;
    }
  | {
      status: 'needs_clarification';
      question: string;
      options: ClarificationOption[];
    };

interface PreparedContext {
  contextMessage?: MiniMaxMessage;
  memory?: GenerationUsage['memory'];
}

interface ParsedSceneAttempt {
  scene?: SceneDocument;
  errors: string[];
}

const EntityRefinementOutputSchema = z.object({
  objects: z.array(SceneObjectSchema).max(24),
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
    @Optional()
    private readonly scaleAgentService?: ScaleAgentService,
    @Optional()
    private readonly contextBuilderService?: ContextBuilderService,
    @Optional()
    private readonly contextCompactionService?: ContextCompactionService,
    @Optional()
    private readonly tokenUsageService?: TokenUsageService,
    @Optional()
    private readonly templatesService?: TemplatesService,
  ) {}

  async generateScene(
    prompt: string,
    chatContext?: ChatContext,
    textProvider?: MiniMaxTextProvider,
  ): Promise<GenerateSceneResult> {
    if (!textProvider && this.shouldUsePartPipeline(prompt)) {
      const pipelineResult = await this.tryGenerateSceneWithParts(prompt);

      if (pipelineResult) {
        return this.withEstimatedUsage(prompt, pipelineResult);
      }
    }

    return this.generateSceneDirectly(prompt, chatContext, textProvider);
  }

  clarifyScenePrompt(prompt: string): GenerationClarificationResult {
    const cricketWicketAmbiguity = this.detectCricketWicketAmbiguity(prompt);

    if (cricketWicketAmbiguity) {
      return cricketWicketAmbiguity;
    }

    return {
      status: 'ready',
      resolvedPrompt: prompt,
    };
  }

  async editScene(
    scene: SceneDocument,
    instruction: string,
    chatContext?: ChatContext,
    textProvider?: MiniMaxTextProvider,
  ): Promise<GenerateSceneResult> {
    const trustedScene = this.ensureEntities(SceneDocumentSchema.parse(scene));
    const preparedContext = await this.prepareContext(
      chatContext,
      trustedScene,
    );
    const approvedReferenceMessage = await this.buildApprovedReferenceMessage(
      instruction,
    );
    const messages: MiniMaxMessage[] = [
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
      ...(preparedContext.contextMessage ? [preparedContext.contextMessage] : []),
      ...(approvedReferenceMessage ? [approvedReferenceMessage] : []),
      {
        role: 'user',
        name: 'user',
        content: `Current scene:
${JSON.stringify(trustedScene, null, 2)}

Instruction:
${instruction}

Return only the complete updated MiniMesh scene JSON.`,
      },
    ];
    const completion = await this.completeWithUsage(
      {
        messages,
        maxCompletionTokens: 5200,
        temperature: 0.2,
      },
      textProvider,
    );
    const firstAttempt = this.parseAndValidate(completion.content);

    if (firstAttempt.scene) {
      const editedScene = this.applyVisualDefaults(instruction, firstAttempt.scene);
      const spatialErrors = this.validateSpatialLayout(editedScene);

      if (spatialErrors.length > 0) {
        const repairedScene = await this.repairSpatialLayout(
          instruction,
          editedScene,
          spatialErrors,
          preparedContext.memory,
          textProvider,
        );

        return {
          scene: repairedScene.scene,
          warnings: ['Edited scene from chat.'],
          usage: repairedScene.usage,
        };
      }

      return {
        scene: editedScene,
        warnings: ['Edited scene from chat.'],
        usage: this.createUsage(messages, completion, preparedContext.memory),
      };
    }

    const repairMessages: MiniMaxMessage[] = [
      {
        role: 'system',
        name: 'MiniMeshSceneEditor',
        content: SCENE_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        name: 'user',
        content: createRepairPrompt(completion.content, firstAttempt.errors),
      },
    ];
    const repairedOutput = await this.completeWithUsage(
      {
        messages: repairMessages,
        temperature: 0.2,
      },
      textProvider,
    );
    const repairAttempt = this.parseAndValidate(repairedOutput.content);

    if (!repairAttempt.scene) {
      throw new BadGatewayException({
        message: 'MiniMax returned edited scene JSON that could not be validated.',
        errors: repairAttempt.errors,
      });
    }

    const editedScene = this.applyVisualDefaults(instruction, repairAttempt.scene);
    const spatialErrors = this.validateSpatialLayout(editedScene);

    if (spatialErrors.length > 0) {
      const repairedScene = await this.repairSpatialLayout(
        instruction,
        editedScene,
        spatialErrors,
        preparedContext.memory,
        textProvider,
      );

      return {
        scene: repairedScene.scene,
        warnings: [
          'Edited scene from chat.',
          'Initial MiniMax edit output was repaired before validation.',
        ],
        usage: repairedScene.usage,
      };
    }

    return {
      scene: editedScene,
      warnings: [
        'Edited scene from chat.',
        'Initial MiniMax edit output was repaired before validation.',
      ],
      usage: this.createUsage(
        repairMessages,
        repairedOutput,
        preparedContext.memory,
      ),
    };
  }

  async refineEntity(
    scene: SceneDocument,
    entityId: string,
    instruction: string,
    chatContext?: ChatContext,
    textProvider?: MiniMaxTextProvider,
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
    const preparedContext = await this.prepareContext(
      chatContext,
      trustedScene,
      entity,
    );
    const approvedReferenceMessage = await this.buildApprovedReferenceMessage(
      instruction,
    );
    const messages: MiniMaxMessage[] = [
      {
        role: 'system',
        name: 'MiniMeshEntityRefiner',
        content: `Return only valid JSON. Refine only the selected MiniMesh entity.
Allowed object types: box, sphere, cylinder, cone, torus, plane.
Preserve every selected object's id and entityId. Never return code.`,
      },
      ...(preparedContext.contextMessage ? [preparedContext.contextMessage] : []),
      ...(approvedReferenceMessage ? [approvedReferenceMessage] : []),
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
    ];
    const completion = await this.completeWithUsage(
      {
        messages,
        maxCompletionTokens: 3200,
        temperature: 0.2,
      },
      textProvider,
    );
    const refinement = this.parseEntityRefinement(
      completion.content,
      selectedObjectIds,
    );

    if (refinement.objects.length === 0) {
      const remainingObjects = trustedScene.objects.filter(
        (object) => !selectedObjectIds.has(object.id),
      );

      if (remainingObjects.length === 0) {
        throw new BadGatewayException({
          message:
            'Cannot remove the only entity in the scene. Use the Edit panel to replace or redesign the whole scene.',
        });
      }

      const updatedScene = SceneDocumentSchema.parse({
        ...trustedScene,
        objects: remainingObjects,
        entities: (trustedScene.entities ?? []).filter(
          (e) => e.id !== entityId,
        ),
      });

      return {
        scene: this.applyVisualDefaults(instruction, updatedScene),
        warnings: [
          `Removed entity "${entity.name}" from the scene.`,
          ...refinement.warnings,
        ].slice(0, 8),
        usage: this.createUsage(messages, completion, preparedContext.memory),
      };
    }

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
    const refinedScene = this.applyVisualDefaults(instruction, updatedScene);
    const spatialErrors = this.validateSpatialLayout(refinedScene);

    if (spatialErrors.length > 0) {
      const repairedScene = await this.repairSpatialLayout(
        instruction,
        refinedScene,
        spatialErrors,
        preparedContext.memory,
        textProvider,
      );

      return {
        scene: repairedScene.scene,
        warnings: ['Refined selected entity.', ...refinement.warnings].slice(
          0,
          8,
        ),
        usage: repairedScene.usage,
      };
    }

    return {
      scene: refinedScene,
      warnings: ['Refined selected entity.', ...refinement.warnings].slice(
        0,
        8,
      ),
      usage: this.createUsage(messages, completion, preparedContext.memory),
    };
  }

  private async generateSceneDirectly(
    prompt: string,
    chatContext?: ChatContext,
    textProvider?: MiniMaxTextProvider,
  ): Promise<GenerateSceneResult> {
    const preparedContext = await this.prepareContext(chatContext);
    const approvedReferenceMessage =
      await this.buildApprovedReferenceMessage(prompt);
    const messages: MiniMaxMessage[] = [
      {
        role: 'system',
        name: 'MiniMesh',
        content: SCENE_SYSTEM_PROMPT,
      },
      ...(preparedContext.contextMessage ? [preparedContext.contextMessage] : []),
      ...(approvedReferenceMessage ? [approvedReferenceMessage] : []),
      {
        role: 'user',
        name: 'user',
        content: createGenerationUserPrompt(prompt),
      },
    ];
    const completion = await this.completeWithUsage(
      {
        messages,
        maxCompletionTokens: 5000,
        temperature: 0.25,
      },
      textProvider,
    );

    const firstAttempt = this.parseAndValidate(completion.content);

    if (firstAttempt.scene) {
      const scene = this.applyVisualDefaults(prompt, firstAttempt.scene);
      const spatialErrors = this.validateSpatialLayout(scene);

      if (spatialErrors.length > 0) {
        const repairedScene = await this.repairSpatialLayout(
          prompt,
          scene,
          spatialErrors,
          preparedContext.memory,
          textProvider,
        );

        return {
          scene: repairedScene.scene,
          warnings: [],
          usage: repairedScene.usage,
        };
      }

      return {
        scene,
        warnings: [],
        usage: this.createUsage(messages, completion, preparedContext.memory),
      };
    }

    const repairMessages: MiniMaxMessage[] = [
      {
        role: 'system',
        name: 'MiniMesh',
        content: SCENE_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        name: 'user',
        content: createRepairPrompt(completion.content, firstAttempt.errors),
      },
    ];
    const repairedOutput = await this.completeWithUsage(
      {
        messages: repairMessages,
        temperature: 0.2,
      },
      textProvider,
    );

    const repairAttempt = this.parseAndValidate(repairedOutput.content);

    if (!repairAttempt.scene) {
      throw new BadGatewayException({
        message: 'MiniMax returned scene JSON that could not be validated.',
        errors: repairAttempt.errors,
      });
    }

    const scene = this.applyVisualDefaults(prompt, repairAttempt.scene);
    const spatialErrors = this.validateSpatialLayout(scene);

    if (spatialErrors.length > 0) {
      const repairedScene = await this.repairSpatialLayout(
        prompt,
        scene,
        spatialErrors,
        preparedContext.memory,
        textProvider,
      );

      return {
        scene: repairedScene.scene,
        warnings: ['Initial MiniMax output was repaired before validation.'],
        usage: repairedScene.usage,
      };
    }

    return {
      scene,
      warnings: ['Initial MiniMax output was repaired before validation.'],
      usage: this.createUsage(
        repairMessages,
        repairedOutput,
        preparedContext.memory,
      ),
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
      const completedScene = this.applyDefaults(litScene);

      if (this.validateSpatialLayout(completedScene).length > 0) {
        return undefined;
      }

      return {
        scene: completedScene,
        warnings: ['Generated with template-assisted multi-part pipeline.'],
      };
    } catch {
      return undefined;
    }
  }

  private async prepareContext(
    chatContext?: ChatContext,
    scene?: SceneDocument,
    selectedEntity?: SceneEntity,
  ): Promise<PreparedContext> {
    const compacted =
      this.contextCompactionService && chatContext
        ? await this.contextCompactionService.compactIfNeeded(
            chatContext,
            scene,
            selectedEntity,
          )
        : {
            context: chatContext,
            didCompact: false,
            compactSummary: chatContext?.compactSummary ?? null,
            compactedAt: null,
          };
    const builtContext = this.contextBuilderService?.buildContextMessage(
      compacted.context,
      scene,
      selectedEntity,
    );

    return {
      contextMessage: builtContext?.contextMessage,
      memory: {
        compactSummary: compacted.compactSummary,
        compactedAt: compacted.compactedAt,
        didCompact: compacted.didCompact,
      },
    };
  }

  private async buildApprovedReferenceMessage(
    query: string,
  ): Promise<MiniMaxMessage | undefined> {
    if (!this.templatesService) {
      return undefined;
    }

    const references = await this.templatesService.searchApprovedReferences(
      query,
      3,
    );

    if (references.length === 0) {
      return undefined;
    }

    return {
      role: 'system',
      name: 'ApprovedMiniMeshReferences',
      content: `Use these approved MiniMesh references as style and structure examples when relevant. Do not copy ids directly if that would create duplicates. Keep the user's request more important than references.
${JSON.stringify(
  references.map((reference) => ({
    name: reference.name,
    type: reference.referenceType,
    category: reference.category,
    description: reference.description,
    tags: reference.tags,
    fragment: reference.fragment,
    scene: reference.scene
      ? {
          sceneName: reference.scene.sceneName,
          description: reference.scene.description,
          objects: reference.scene.objects.slice(0, 12),
          lights: reference.scene.lights.slice(0, 2),
        }
      : undefined,
  })),
  null,
  2,
)}`,
    };
  }

  private async completeWithUsage(
    request: MiniMaxChatRequest,
    textProvider: MiniMaxTextProvider = this.textProvider,
  ): Promise<MiniMaxCompletion> {
    if (textProvider.completeWithUsage) {
      return textProvider.completeWithUsage(request);
    }

    return {
      content: await textProvider.complete(request),
    };
  }

  private createUsage(
    messages: MiniMaxMessage[],
    completion: MiniMaxCompletion,
    memory?: GenerationUsage['memory'],
  ): GenerationUsage | undefined {
    if (!this.tokenUsageService) {
      return memory ? { memory } : undefined;
    }

    return {
      ...this.tokenUsageService.createUsage(
        messages,
        completion.content,
        completion.usage,
      ),
      memory,
    };
  }

  private async repairSpatialLayout(
    prompt: string,
    scene: SceneDocument,
    validationErrors: string[],
    memory?: GenerationUsage['memory'],
    textProvider?: MiniMaxTextProvider,
  ): Promise<{ scene: SceneDocument; usage?: GenerationUsage }> {
    const repairMessages: MiniMaxMessage[] = [
      {
        role: 'system',
        name: 'MiniMeshSpatialValidator',
        content: SCENE_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        name: 'user',
        content: createSpatialRepairPrompt(scene, validationErrors),
      },
    ];
    const repairedOutput = await this.completeWithUsage(
      {
        messages: repairMessages,
        maxCompletionTokens: 5200,
        temperature: 0.15,
      },
      textProvider,
    );
    const repairAttempt = this.parseAndValidate(repairedOutput.content);

    if (!repairAttempt.scene) {
      throw new BadGatewayException({
        message: 'MiniMax returned scene JSON that could not be spatially repaired.',
        errors: repairAttempt.errors,
      });
    }

    const repairedScene = this.applyVisualDefaults(prompt, repairAttempt.scene);
    const remainingErrors = this.validateSpatialLayout(repairedScene);

    if (remainingErrors.length > 0) {
      throw new BadGatewayException({
        message: 'MiniMax returned scene JSON with overlapping objects.',
        errors: remainingErrors,
      });
    }

    return {
      scene: repairedScene,
      usage: this.createUsage(repairMessages, repairedOutput, memory),
    };
  }

  private withEstimatedUsage(
    prompt: string,
    result: GenerateSceneResult,
  ): GenerateSceneResult {
    if (!this.tokenUsageService) {
      return result;
    }

    const messages: MiniMaxMessage[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    return {
      ...result,
      usage: this.tokenUsageService.createUsage(
        messages,
        JSON.stringify(result.scene),
      ),
    };
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
    const sceneWithStablePlanes = this.stabilizeSupportPlanes(sceneWithEntities);
    const stableScene =
      this.scaleAgentService?.enhance(sceneWithStablePlanes) ??
      sceneWithStablePlanes;

    return {
      ...stableScene,
      lights:
        stableScene.lights.length > 0
          ? stableScene.lights
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

  private stabilizeSupportPlanes(scene: SceneDocument): SceneDocument {
    return SceneDocumentSchema.parse({
      ...scene,
      objects: scene.objects.map((object) => {
        if (!this.isFlatSupportPlane(object, scene.entities ?? [])) {
          return object;
        }

        return {
          ...object,
          position: [object.position[0], 0, object.position[2]],
          rotation: [-1.57, 0, 0],
        };
      }),
    });
  }

  private isFlatSupportPlane(
    object: SceneObject,
    entities: SceneEntity[],
  ): boolean {
    if (object.type !== 'plane') {
      return false;
    }

    const entity = entities.find((item) => item.id === object.entityId);
    const text = `${object.id} ${object.name} ${object.role ?? ''} ${entity?.name ?? ''} ${entity?.description ?? ''} ${(entity?.tags ?? []).join(' ')}`.toLowerCase();

    if (
      this.hasAny(text, [
        'billboard',
        'screen',
        'sign',
        'panel',
        'window',
        'poster',
        'hologram',
      ])
    ) {
      return false;
    }

    const supportNamed = this.hasAny(text, [
      'ground',
      'floor',
      'field',
      'surface',
      'road',
      'street',
      'platform',
      'terrain',
      'pitch',
      'base',
    ]);
    const largePlane = Math.max(...object.scale) >= 5;

    return supportNamed || largePlane;
  }

  private validateSpatialLayout(scene: SceneDocument): string[] {
    const byPosition = new Map<string, SceneObject>();
    const errors: string[] = [];

    for (const object of scene.objects) {
      if (this.shouldIgnoreSpatialOverlap(object, scene.entities ?? [])) {
        continue;
      }

      const key = this.positionKey(object.position);
      const existing = byPosition.get(key);

      if (!existing) {
        byPosition.set(key, object);
        continue;
      }

      errors.push(
        `Objects "${existing.id}" and "${object.id}" share position [${object.position.join(', ')}]. Offset one so both remain visible.`,
      );

      if (errors.length >= 8) {
        break;
      }
    }

    return errors;
  }

  private shouldIgnoreSpatialOverlap(
    object: SceneObject,
    entities: SceneEntity[],
  ): boolean {
    if (this.isFlatSupportPlane(object, entities)) {
      return true;
    }

    return object.type === 'plane' && Math.min(...object.scale) <= 0.05;
  }

  private positionKey(position: [number, number, number]): string {
    return position.map((value) => value.toFixed(2)).join('|');
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

  private detectCricketWicketAmbiguity(
    prompt: string,
  ): GenerationClarificationResult | undefined {
    const normalizedPrompt = prompt.toLowerCase();

    if (
      !/\bcricket\b/.test(normalizedPrompt) ||
      !/\bwickets?\b/.test(normalizedPrompt)
    ) {
      return undefined;
    }

    if (
      /\b(full|complete)\s+wicket\s+sets?\b/.test(normalizedPrompt) ||
      /\bsets?\s+of\s+wickets?\b/.test(normalizedPrompt) ||
      /\bstumps?\b/.test(normalizedPrompt)
    ) {
      return undefined;
    }

    const countMatch = normalizedPrompt.match(
      /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+wickets?\b/,
    );

    if (!countMatch) {
      return undefined;
    }

    const count = this.parseCountToken(countMatch[1]);

    if (!count || count < 2) {
      return undefined;
    }

    const fullSetPrompt = this.replaceFirstWicketCount(
      prompt,
      `${count} full cricket wicket sets (${count * 3} stumps total)`,
    );
    const stumpPrompt = this.replaceFirstWicketCount(
      prompt,
      `${count} cricket stumps forming one wicket`,
    );

    return {
      status: 'needs_clarification',
      question: `When you say ${count} wickets, do you mean ${count} full wicket sets or ${count} stumps forming one wicket?`,
      options: [
        {
          id: 'stumps-in-one-wicket',
          label: `${count} stumps forming one wicket`,
          resolvedPrompt: stumpPrompt,
        },
        {
          id: 'full-wicket-sets',
          label: `${count} full wicket sets (${count * 3} stumps total)`,
          resolvedPrompt: fullSetPrompt,
        },
        {
          id: 'manual-clarification',
          label: 'I will clarify manually',
          resolvedPrompt: prompt,
        },
      ],
    };
  }

  private parseCountToken(value: string): number | null {
    const number = Number(value);

    if (Number.isInteger(number)) {
      return number;
    }

    const words: Record<string, number> = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
    };

    return words[value] ?? null;
  }

  private replaceFirstWicketCount(prompt: string, replacement: string): string {
    return prompt.replace(
      /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+wickets?\b/i,
      replacement,
    );
  }

  private parseEntityRefinement(
    rawOutput: string,
    allowedObjectIds: Set<string>,
  ): z.infer<typeof EntityRefinementOutputSchema> {
    try {
      const extracted = this.extractJsonObject(rawOutput);
      const parsed = JSON.parse(extracted) as unknown;
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
    const sourceType = type.toLowerCase();

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

    if (
      ['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane'].includes(
        sourceType,
      )
    ) {
      return sourceType as SceneObject['type'];
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

  private hasAny(value: string, needles: string[]): boolean {
    return needles.some((needle) => value.includes(needle));
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
