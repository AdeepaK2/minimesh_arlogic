import { z } from 'zod';
import { SceneDocumentSchema } from '../../../schemas/scene.schema';

export const EditSceneRequestSchema = z.object({
  scene: SceneDocumentSchema,
  instruction: z.string().trim().min(3).max(1200),
});

export type EditSceneRequest = z.infer<typeof EditSceneRequestSchema>;
