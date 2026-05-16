export interface ObjectTemplateRecord {
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

export interface CreateObjectTemplateInput {
  name: string;
  category: string;
  description: string;
  tags: string[];
  semanticKeywords?: string[];
  aiPromptSeed?: string;
  sceneJsonFragment: unknown;
  isPublic: boolean;
}

export interface ObjectTemplateSearchHit extends ObjectTemplateRecord {
  score: number;
}

export const OBJECT_TEMPLATE_CATEGORIES = [
  "vehicle",
  "environment",
  "architecture",
  "signage",
  "prop",
  "detail",
  "lighting",
] as const;

/** Minimal valid fragment for a fresh form after save or "New". */
export const EMPTY_SCENE_FRAGMENT = `{
  "objects": [
    {
      "id": "new-object",
      "name": "New object",
      "type": "box",
      "position": [0, 0.5, 0],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1],
      "material": { "color": "#64748b", "metalness": 0, "roughness": 0.6 }
    }
  ]
}`;

export const EXAMPLE_SCENE_FRAGMENT = `{
  "objects": [
    {
      "id": "street-lamp-pole",
      "name": "Street lamp pole",
      "type": "cylinder",
      "position": [-2.6, 0.75, 1.6],
      "rotation": [0, 0, 0],
      "scale": [0.04, 0.75, 0.04],
      "material": { "color": "#334155", "metalness": 0.5, "roughness": 0.45 }
    },
    {
      "id": "street-lamp-head",
      "name": "Street lamp head",
      "type": "sphere",
      "position": [-2.6, 1.55, 1.6],
      "rotation": [0, 0, 0],
      "scale": [0.16, 0.16, 0.16],
      "material": { "color": "#38bdf8", "metalness": 0, "roughness": 0.2 }
    }
  ],
  "lights": [
    {
      "id": "street-lamp-light",
      "type": "point",
      "color": "#38bdf8",
      "intensity": 1.25,
      "position": [-2.6, 1.6, 1.6]
    }
  ]
}`;
