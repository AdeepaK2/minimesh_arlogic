import { z } from 'zod';

const Vector3Schema = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
]);

const HexColorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, {
  message: 'Color must be a hex value such as #7dd3fc.',
});

export const SceneObjectTypeSchema = z.enum([
  'box',
  'sphere',
  'cylinder',
  'cone',
  'torus',
  'plane',
]);

export const AnimationTypeSchema = z.enum([
  'rotate',
  'move',
  'bounce',
  'pulse',
  'orbit',
  'open_close',
]);

export const SceneObjectSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  type: SceneObjectTypeSchema,
  position: Vector3Schema,
  rotation: Vector3Schema,
  scale: Vector3Schema.refine((values) => values.every((value) => value > 0), {
    message: 'Scale values must be positive.',
  }),
  material: z.object({
    color: HexColorSchema,
    metalness: z.number().min(0).max(1).optional(),
    roughness: z.number().min(0).max(1).optional(),
    emissive: HexColorSchema.optional(),
    emissiveIntensity: z.number().min(0).max(5).optional(),
  }),
  animation: z
    .object({
      type: AnimationTypeSchema,
      axis: z.enum(['x', 'y', 'z']).optional(),
      speed: z.number().positive().max(10).optional(),
      loop: z.boolean().optional(),
      target: z.string().min(1).max(80).optional(),
    })
    .optional(),
});

export const SceneLightSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.enum(['ambient', 'directional', 'point']),
  color: HexColorSchema.default('#ffffff'),
  intensity: z.number().min(0).max(10).default(1),
  position: Vector3Schema.optional(),
});

export const SceneCameraSchema = z.object({
  position: Vector3Schema.default([5, 4, 7]),
  target: Vector3Schema.default([0, 0, 0]),
  fov: z.number().min(25).max(90).default(45),
});

export const SceneEnvironmentSchema = z.object({
  backgroundColor: HexColorSchema.default('#0b0f14'),
  fogColor: HexColorSchema.default('#0b0f14'),
  fogNear: z.number().min(0).max(100).default(18),
  fogFar: z.number().min(1).max(200).default(42),
  exposure: z.number().min(0.1).max(3).default(1),
});

export const SceneDocumentSchema = z.object({
  sceneName: z.string().min(1).max(120),
  description: z.string().max(600).optional(),
  objects: z.array(SceneObjectSchema).min(1).max(60),
  lights: z.array(SceneLightSchema).max(8).default([]),
  camera: SceneCameraSchema.default({
    position: [5, 4, 7],
    target: [0, 0, 0],
    fov: 45,
  }),
  environment: SceneEnvironmentSchema.optional(),
});

export type SceneDocument = z.infer<typeof SceneDocumentSchema>;
export type SceneObject = z.infer<typeof SceneObjectSchema>;
export type SceneLight = z.infer<typeof SceneLightSchema>;
export type SceneCamera = z.infer<typeof SceneCameraSchema>;
export type SceneEnvironment = z.infer<typeof SceneEnvironmentSchema>;
