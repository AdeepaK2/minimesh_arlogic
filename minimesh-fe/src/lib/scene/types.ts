export type SceneObjectType =
  | "box"
  | "sphere"
  | "cylinder"
  | "cone"
  | "torus"
  | "plane";

export type AnimationType =
  | "rotate"
  | "move"
  | "bounce"
  | "pulse"
  | "orbit"
  | "open_close";

export type Vector3Tuple = [number, number, number];

export interface SceneMaterial {
  color: string;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

export interface SceneEntityTransform {
  position: Vector3Tuple;
  rotation: Vector3Tuple;
  scale: Vector3Tuple;
}

export interface SceneEntity {
  id: string;
  name: string;
  description?: string;
  sourceGroupId?: string;
  objectIds: string[];
  tags: string[];
  transform: SceneEntityTransform;
}

export interface SceneAnimation {
  type: AnimationType;
  axis?: "x" | "y" | "z";
  speed?: number;
  loop?: boolean;
  target?: string;
}

export interface SceneObject {
  id: string;
  name: string;
  entityId?: string;
  role?: string;
  type: SceneObjectType;
  position: Vector3Tuple;
  rotation: Vector3Tuple;
  scale: Vector3Tuple;
  material: SceneMaterial;
  animation?: SceneAnimation;
}

export interface SceneLight {
  id: string;
  type: "ambient" | "directional" | "point";
  color: string;
  intensity: number;
  position?: Vector3Tuple;
}

export interface SceneCamera {
  position: Vector3Tuple;
  target: Vector3Tuple;
  fov: number;
}

export interface SceneEnvironment {
  backgroundColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  exposure: number;
}

export interface SceneDocument {
  sceneName: string;
  description?: string;
  objects: SceneObject[];
  entities?: SceneEntity[];
  lights: SceneLight[];
  camera: SceneCamera;
  environment?: SceneEnvironment;
}

export interface GenerateSceneResponse {
  scene: SceneDocument;
  warnings: string[];
}

export interface SceneChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "pending" | "applied" | "failed";
  action?: "generate" | "edit-scene" | "refine-entity";
  targetName?: string;
  versionNumber?: number;
  createdAt: string;
}

export interface SavedScene {
  id: string;
  projectId: string | null;
  name: string;
  description: string | null;
  latestScene: SceneDocument;
  latestPrompt: string | null;
  latestVersionNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface SceneVersion {
  id: string;
  sceneId: string;
  versionNumber: number;
  prompt: string | null;
  scene: SceneDocument;
  warnings: string[];
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  sceneCount?: number;
  createdAt: string;
  updatedAt: string;
}
