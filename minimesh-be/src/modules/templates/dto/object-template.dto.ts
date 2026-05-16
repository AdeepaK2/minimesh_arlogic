import { z } from 'zod';
import { SceneFragmentSchema } from '../../../schemas/scene-fragment.schema';

export const SearchObjectTemplatesSchema = z.object({
  query: z.string().trim().min(1).max(500),
  limit: z.number().int().min(1).max(24).default(8),
});

export const CreateObjectTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(64),
  description: z.string().trim().min(1).max(2000),
  tags: z.array(z.string().trim().min(1).max(48)).max(24).default([]),
  semanticKeywords: z.array(z.string().trim().min(1).max(48)).max(24).default([]),
  aiPromptSeed: z.string().trim().max(500).optional(),
  sceneJsonFragment: SceneFragmentSchema,
  isPublic: z.boolean().default(true),
});

export type CreateObjectTemplateRequest = z.infer<
  typeof CreateObjectTemplateSchema
>;

export const UpdateObjectTemplateSchema = CreateObjectTemplateSchema;

export type UpdateObjectTemplateRequest = z.infer<
  typeof UpdateObjectTemplateSchema
>;

export interface ObjectTemplateResponse {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  sceneJsonFragment: unknown;
  isPublic: boolean;
  hasEmbedding: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ObjectTemplateSearchResult extends ObjectTemplateResponse {
  score: number;
}
