import type { SceneDocument } from '../../schemas/scene.schema';
import type { GenerationUsage } from '../generation/generation-context.types';

export interface SceneMemoryMetadata {
  chatContextSummary: string | null;
  chatContextUpdatedAt: string | null;
  estimatedInputTokens: number | null;
  estimatedOutputTokens: number | null;
  providerInputTokens: number | null;
  providerOutputTokens: number | null;
}

export interface SceneRow {
  id: string;
  project_id: string | null;
  user_id: string;
  name: string;
  description: string | null;
  latest_scene_json: SceneDocument;
  latest_prompt: string | null;
  latest_version_number: number;
  chat_context_summary: string | null;
  chat_context_updated_at: string | null;
  estimated_input_tokens: number | null;
  estimated_output_tokens: number | null;
  provider_input_tokens: number | null;
  provider_output_tokens: number | null;
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
  chat_context_summary: string | null;
  chat_context_updated_at: string | null;
  estimated_input_tokens: number | null;
  estimated_output_tokens: number | null;
  provider_input_tokens: number | null;
  provider_output_tokens: number | null;
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
  memory: SceneMemoryMetadata;
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
  memory: SceneMemoryMetadata;
  createdAt: string;
}

export type SceneUsageRequest = GenerationUsage;
