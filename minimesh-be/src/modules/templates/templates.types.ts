import type { SceneFragment } from '../../schemas/scene-fragment.schema';

export interface TemplateRow {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  scene_json_fragment: unknown;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ObjectTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  fragment: SceneFragment;
}

export interface TemplateSearchResult extends ObjectTemplate {
  score: number;
}
