import type { SceneFragment } from '../../schemas/scene-fragment.schema';
import type { SceneDocument } from '../../schemas/scene.schema';

export type ApprovedReferenceType = 'fragment' | 'scene';

export interface TemplateRow {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  scene_json_fragment: unknown;
  reference_type?: ApprovedReferenceType;
  scene_json_document?: unknown;
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
  referenceType: ApprovedReferenceType;
  scene?: SceneDocument;
}

export interface TemplateSearchResult extends ObjectTemplate {
  score: number;
}

export interface ApprovedReference extends ObjectTemplate {
  scene?: SceneDocument;
  approvedAt?: string | null;
}

export interface ApprovedReferenceSearchResult extends ApprovedReference {
  score: number;
}
