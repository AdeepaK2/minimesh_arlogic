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

export interface SceneDocument {
  sceneName: string;
  description?: string;
  objects: SceneObject[];
  lights: SceneLight[];
  camera: SceneCamera;
}

export interface GenerateSceneResponse {
  scene: SceneDocument;
  warnings: string[];
}
