import { z } from 'zod';

const Vector3Schema = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
]);

const HexColorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, {
  message: 'Color must be a hex value such as #38bdf8.',
});

export const LogicalPrimitiveTypeSchema = z.enum([
  'box',
  'sphere',
  'cylinder',
  'cone',
  'torus',
  'plane',
]);

export const LogicalNodeSchema = z.object({
  name: z.string().min(1).max(120),
  primitiveType: LogicalPrimitiveTypeSchema.optional(),
  translation: Vector3Schema.default([0, 0, 0]),
  eulerRotation: Vector3Schema.default([0, 0, 0]),
  scale: Vector3Schema
    .refine((v) => v.every((n) => n > 0), { message: 'Scale values must be positive.' })
    .default([1, 1, 1]),
  materialIndex: z.number().int().min(0).optional(),
  lightIndex: z.number().int().min(0).optional(),
  entityId: z.string().min(1).max(80).optional(),
  children: z.array(z.number().int().min(0)).max(60).optional(),
});

export const LogicalMaterialSchema = z.object({
  name: z.string().min(1).max(120),
  baseColorHex: HexColorSchema.default('#38bdf8'),
  metallicFactor: z.number().min(0).max(1).default(0),
  roughnessFactor: z.number().min(0).max(1).default(0.55),
  emissiveHex: HexColorSchema.optional(),
  emissiveIntensity: z.number().min(0).max(5).optional(),
  alphaMode: z.enum(['OPAQUE', 'BLEND']).default('OPAQUE'),
  doubleSided: z.boolean().optional(),
});

export const LogicalLightSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(['ambient', 'directional', 'point']),
  colorHex: HexColorSchema.default('#ffffff'),
  intensity: z.number().min(0).max(20).default(1),
  position: Vector3Schema.optional(),
});

export const LogicalCameraSchema = z.object({
  position: Vector3Schema.default([5, 4, 7]),
  target: Vector3Schema.default([0, 0, 0]),
  fovDegrees: z.number().min(25).max(90).default(45),
});

export const LogicalEnvironmentSchema = z.object({
  backgroundColorHex: HexColorSchema.default('#0b0f14'),
  fogColorHex: HexColorSchema.optional(),
  fogNear: z.number().min(0).max(100).optional(),
  fogFar: z.number().min(1).max(200).optional(),
});

export const LogicalGltfDocumentSchema = z.object({
  sceneName: z.string().min(1).max(120),
  description: z.string().max(600).optional(),
  nodes: z.array(LogicalNodeSchema).min(1).max(60),
  materials: z.array(LogicalMaterialSchema).min(1).max(60),
  lights: z.array(LogicalLightSchema).max(8).default([]),
  camera: LogicalCameraSchema.default({
    position: [5, 4, 7],
    target: [0, 0, 0],
    fovDegrees: 45,
  }),
  environment: LogicalEnvironmentSchema.optional(),
});

export type LogicalPrimitiveType = z.infer<typeof LogicalPrimitiveTypeSchema>;
export type LogicalNode = z.infer<typeof LogicalNodeSchema>;
export type LogicalMaterial = z.infer<typeof LogicalMaterialSchema>;
export type LogicalLight = z.infer<typeof LogicalLightSchema>;
export type LogicalCamera = z.infer<typeof LogicalCameraSchema>;
export type LogicalGltfDocument = z.infer<typeof LogicalGltfDocumentSchema>;

/**
 * The assembled glTF 2.0 document returned to the frontend.
 * Contains full vertex buffers so GLTFLoader can render it directly.
 */
export interface BuiltGltfDocument {
  asset: { version: '2.0'; generator: string };
  scene: number;
  scenes: Array<{ name: string; nodes: number[] }>;
  nodes: Array<{
    name: string;
    mesh?: number;
    translation?: [number, number, number];
    rotation?: [number, number, number, number];
    scale?: [number, number, number];
    extras?: Record<string, unknown>;
    extensions?: Record<string, unknown>;
  }>;
  meshes: Array<{
    name: string;
    primitives: Array<{
      attributes: { POSITION: number; NORMAL: number; TEXCOORD_0: number };
      indices: number;
      material: number;
    }>;
  }>;
  materials: Array<{
    name: string;
    pbrMetallicRoughness: {
      baseColorFactor: [number, number, number, number];
      metallicFactor: number;
      roughnessFactor: number;
    };
    emissiveFactor?: [number, number, number];
    alphaMode?: string;
    doubleSided?: boolean;
  }>;
  accessors: Array<{
    bufferView: number;
    componentType: number;
    count: number;
    type: string;
    max?: number[];
    min?: number[];
    byteOffset?: number;
  }>;
  bufferViews: Array<{
    buffer: number;
    byteOffset: number;
    byteLength: number;
    target?: number;
  }>;
  buffers: Array<{ byteLength: number; uri: string }>;
  extensionsUsed?: string[];
  extensions?: Record<string, unknown>;
  extras?: {
    sceneName: string;
    description?: string;
    camera: { position: [number, number, number]; target: [number, number, number]; fovDegrees: number };
    environment?: { backgroundColorHex: string; fogColorHex?: string; fogNear?: number; fogFar?: number };
    ambientLights: Array<{ colorHex: string; intensity: number }>;
  };
}
