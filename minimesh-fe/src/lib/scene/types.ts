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

export interface SceneFragment {
  objects: SceneObject[];
  lights: SceneLight[];
}

export interface GenerateSceneResponse {
  scene: SceneDocument;
  warnings: string[];
  usage?: GenerationUsage;
  review?: GenerationJobReview;
}

export type GenerationJobAction = "generate" | "edit-scene" | "refine-entity";
export type GenerationJobStatus = "queued" | "running" | "succeeded" | "failed";
export type GenerationJobStepStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed";

export interface GenerationJobStep {
  id: string;
  label: string;
  status: GenerationJobStepStatus;
  detail?: string;
  createdAt: string;
  completedAt?: string;
}

export interface GenerationJobReview {
  selectedCandidate: "candidateA" | "candidateB";
  candidateCount: number;
  scores: Array<{
    candidate: "candidateA" | "candidateB";
    score: number;
    valid: boolean;
    issues: string[];
  }>;
  judge?: "heuristic" | "gpt-5.4-mini";
}

export interface GenerationJobResponse {
  jobId: string;
  action: GenerationJobAction;
  status: GenerationJobStatus;
  steps: GenerationJobStep[];
  result?: GenerateSceneResponse;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TokenUsage {
  estimatedInputTokens?: number;
  estimatedOutputTokens?: number;
  providerInputTokens?: number | null;
  providerOutputTokens?: number | null;
  contextBudgetTokens?: number;
  contextBudgetPercent?: number;
  usedProviderUsage?: boolean;
}

export interface GenerationMemory {
  compactSummary?: string | null;
  compactedAt?: string | null;
  didCompact?: boolean;
}

export interface GenerationUsage extends TokenUsage {
  memory?: GenerationMemory;
}

export interface SceneMemoryMetadata {
  chatContextSummary: string | null;
  chatContextUpdatedAt: string | null;
  estimatedInputTokens: number | null;
  estimatedOutputTokens: number | null;
  providerInputTokens: number | null;
  providerOutputTokens: number | null;
}

export interface GenerationChatContext {
  compactSummary?: string | null;
  recentMessages?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  selectedEntityName?: string | null;
  sceneName?: string | null;
}

export interface GenerationClarificationOption {
  id: string;
  label: string;
  resolvedPrompt: string;
}

export type GenerationClarificationResponse =
  | {
      status: "ready";
      resolvedPrompt: string;
    }
  | {
      status: "needs_clarification";
      question: string;
      options: GenerationClarificationOption[];
    };

export interface SceneChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "pending" | "applied" | "failed";
  action?: "generate" | "edit-scene" | "refine-entity" | "clarify";
  clarificationOptions?: GenerationClarificationOption[];
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
  memory: SceneMemoryMetadata;
  createdAt: string;
  updatedAt: string;
}

export type ApprovedReferenceType = "fragment" | "scene";

export interface ApprovedReference {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  referenceType: ApprovedReferenceType;
  fragment: SceneFragment;
  scene?: SceneDocument;
  score?: number;
  approvedAt?: string | null;
}

export interface SceneVersion {
  id: string;
  sceneId: string;
  versionNumber: number;
  prompt: string | null;
  scene: SceneDocument;
  warnings: string[];
  memory: SceneMemoryMetadata;
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
