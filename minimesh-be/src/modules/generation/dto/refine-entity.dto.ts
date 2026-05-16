import { z } from 'zod';
import { SceneDocumentSchema } from '../../../schemas/scene.schema';
import { ChatContextSchema } from '../generation-context.types';

export const RefineEntityRequestSchema = z.object({
  scene: SceneDocumentSchema,
  entityId: z.string().trim().min(1).max(80),
  instruction: z.string().trim().min(3).max(1200),
  chatContext: ChatContextSchema,
});

export type RefineEntityRequest = z.infer<typeof RefineEntityRequestSchema>;
