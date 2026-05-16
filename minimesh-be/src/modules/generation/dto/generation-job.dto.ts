import { z } from 'zod';
import { SceneDocumentSchema } from '../../../schemas/scene.schema';
import { LogicalGltfDocumentSchema } from '../../../schemas/logical-gltf.schema';
import { ChatContextSchema } from '../generation-context.types';

export const GenerationJobRequestSchema = z
  .object({
    action: z.enum(['generate', 'edit-scene', 'refine-entity']),
    prompt: z.string().trim().min(3).max(1200).optional(),
    instruction: z.string().trim().min(3).max(1200).optional(),
    scene: SceneDocumentSchema.optional(),
    logicalGltf: LogicalGltfDocumentSchema.optional(),
    entityId: z.string().trim().min(1).max(80).optional(),
    chatContext: ChatContextSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.action === 'generate' && !value.prompt) {
      context.addIssue({
        code: 'custom',
        message: 'prompt is required for generate jobs.',
        path: ['prompt'],
      });
    }

    if (value.action === 'edit-scene' && (!value.scene || !value.instruction)) {
      context.addIssue({
        code: 'custom',
        message: 'scene and instruction are required for scene edit jobs.',
        path: ['instruction'],
      });
    }

    if (
      value.action === 'refine-entity' &&
      (!value.scene || !value.entityId || !value.instruction)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'scene, entityId, and instruction are required for entity refinement jobs.',
        path: ['entityId'],
      });
    }
  });

export type GenerationJobRequestDto = z.infer<typeof GenerationJobRequestSchema>;
