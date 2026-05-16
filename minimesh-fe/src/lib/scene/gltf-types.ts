/**
 * The assembled glTF 2.0 document returned by the backend.
 * Contains full vertex buffers so GLTFLoader can render it directly.
 * Mirrors BuiltGltfDocument in minimesh-be/src/schemas/logical-gltf.schema.ts.
 */
export interface BuiltGltfDocument {
  asset: { version: "2.0"; generator: string };
  scene: number;
  scenes: Array<{ name: string; nodes: number[] }>;
  nodes: Array<{
    name: string;
    mesh?: number;
    translation?: [number, number, number];
    rotation?: [number, number, number, number];
    scale?: [number, number, number];
    children?: number[];
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
    camera: {
      position: [number, number, number];
      target: [number, number, number];
      fovDegrees: number;
    };
    environment?: {
      backgroundColorHex: string;
      fogColorHex?: string;
      fogNear?: number;
      fogFar?: number;
    };
    ambientLights: Array<{ colorHex: string; intensity: number }>;
  };
}

/**
 * The logical (LLM-generated) glTF document — no binary buffers.
 * Mirrors LogicalGltfDocument in minimesh-be/src/schemas/logical-gltf.schema.ts.
 */
export interface LogicalGltfDocument {
  sceneName: string;
  description?: string;
  nodes: Array<{
    name: string;
    primitiveType?: "box" | "sphere" | "cylinder" | "cone" | "torus" | "plane";
    translation?: [number, number, number];
    eulerRotation?: [number, number, number];
    scale?: [number, number, number];
    materialIndex?: number;
    lightIndex?: number;
    entityId?: string;
    children?: number[];
  }>;
  materials: Array<{
    name: string;
    baseColorHex: string;
    metallicFactor?: number;
    roughnessFactor?: number;
    emissiveHex?: string;
    emissiveIntensity?: number;
    alphaMode?: "OPAQUE" | "BLEND";
    doubleSided?: boolean;
  }>;
  lights: Array<{
    name: string;
    type: "ambient" | "directional" | "point";
    colorHex: string;
    intensity: number;
    position?: [number, number, number];
  }>;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    fovDegrees: number;
  };
  environment?: {
    backgroundColorHex: string;
    fogColorHex?: string;
    fogNear?: number;
    fogFar?: number;
  };
}
