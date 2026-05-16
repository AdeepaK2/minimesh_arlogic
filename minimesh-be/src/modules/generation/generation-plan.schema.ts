import { z } from 'zod';

export const SceneEntityGroupSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  query: z.string().min(1).max(180),
  priority: z.number().int().min(1).max(10).default(5),
});

export const ScenePlanSchema = z.object({
  sceneName: z.string().min(1).max(120),
  description: z.string().min(1).max(600),
  styleKeywords: z.array(z.string().min(1).max(40)).max(12).default([]),
  cameraIntent: z.string().min(1).max(180).default('cinematic view'),
  lightingIntent: z.string().min(1).max(180).default('balanced lighting'),
  maxObjectBudget: z.number().int().min(8).max(60).default(36),
  entityGroups: z.array(SceneEntityGroupSchema).min(1).max(10),
});

export type ScenePlan = z.infer<typeof ScenePlanSchema>;
