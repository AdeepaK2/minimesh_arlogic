import { z } from 'zod';
import { SceneDocumentSchema } from '../../../schemas/scene.schema';

export const CreateSceneRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(600).optional(),
  prompt: z.string().trim().max(1200).optional(),
  scene: SceneDocumentSchema,
  warnings: z.array(z.string()).max(12).default([]),
});

export const SaveSceneVersionRequestSchema = z.object({
  prompt: z.string().trim().max(1200).optional(),
  scene: SceneDocumentSchema,
  warnings: z.array(z.string()).max(12).default([]),
});

export const UpdateSceneRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(600).nullable().optional(),
});

export type CreateSceneRequest = z.infer<typeof CreateSceneRequestSchema>;
export type SaveSceneVersionRequest = z.infer<
  typeof SaveSceneVersionRequestSchema
>;
export type UpdateSceneRequest = z.infer<typeof UpdateSceneRequestSchema>;
