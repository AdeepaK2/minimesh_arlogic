import { z } from 'zod';
import {
  SceneCameraSchema,
  SceneEnvironmentSchema,
  SceneLightSchema,
} from '../../schemas/scene.schema';

const HexColorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/);

export const LightingMaterialUpdateSchema = z.object({
  objectId: z.string().min(1).max(80),
  emissive: HexColorSchema,
  emissiveIntensity: z.number().min(0).max(5),
});

export const LightingPassSchema = z.object({
  lights: z.array(SceneLightSchema).min(1).max(8),
  camera: SceneCameraSchema,
  environment: SceneEnvironmentSchema,
  materialUpdates: z.array(LightingMaterialUpdateSchema).max(30).default([]),
});

export type LightingPass = z.infer<typeof LightingPassSchema>;
