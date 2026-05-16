import type { SceneDocument } from '../../schemas/scene.schema';

export interface SceneRow {
  id: string;
  project_id: string | null;
  user_id: string;
  name: string;
  description: string | null;
  latest_scene_json: SceneDocument;
  latest_prompt: string | null;
  latest_version_number: number;
  created_at: string;
  updated_at: string;
}

export interface SceneVersionRow {
  id: string;
  scene_id: string;
  user_id: string;
  version_number: number;
  prompt: string | null;
  scene_json: SceneDocument;
  warnings: string[];
  created_at: string;
}

export interface SavedSceneResponse {
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

export interface SceneVersionResponse {
  id: string;
  sceneId: string;
  versionNumber: number;
  prompt: string | null;
  scene: SceneDocument;
  warnings: string[];
  createdAt: string;
}
