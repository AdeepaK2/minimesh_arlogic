import { z } from 'zod';
import { SceneDocumentSchema } from '../../../schemas/scene.schema';

export const RefineEntityRequestSchema = z.object({
  scene: SceneDocumentSchema,
  entityId: z.string().trim().min(1).max(80),
  instruction: z.string().trim().min(3).max(1200),
});

export type RefineEntityRequest = z.infer<typeof RefineEntityRequestSchema>;
