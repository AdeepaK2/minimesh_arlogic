import { z } from 'zod';
import { SceneLightSchema, SceneObjectSchema } from './scene.schema';

export const SceneFragmentSchema = z.object({
  objects: z.array(SceneObjectSchema).min(1).max(24),
  lights: z.array(SceneLightSchema).max(4).default([]),
});

export type SceneFragment = z.infer<typeof SceneFragmentSchema>;
