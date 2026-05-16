import {
  EMPTY_SCENE_FRAGMENT,
  OBJECT_TEMPLATE_CATEGORIES,
} from "@/lib/admin/object-template-types";
import type { CreateObjectTemplateInput } from "@/lib/admin/object-template-types";
import { normalizeCategory } from "@/lib/admin/category-options";
import { validateSceneFragmentJson } from "@/lib/admin/validate-scene-fragment";

export interface SceneBuilderFormState {
  name: string;
  category: string;
  description: string;
  tagsInput: string;
  semanticKeywords: string;
  aiPromptSeed: string;
  sceneJson: string;
  isPublic: boolean;
}

export const INITIAL_SCENE_BUILDER_FORM: SceneBuilderFormState = {
  name: "",
  category: OBJECT_TEMPLATE_CATEGORIES[0],
  description: "",
  tagsInput: "",
  semanticKeywords: "",
  aiPromptSeed: "",
  sceneJson: EMPTY_SCENE_FRAGMENT,
  isPublic: true,
};

export function buildCreateTemplatePayload(
  form: SceneBuilderFormState,
): { ok: true; payload: CreateObjectTemplateInput } | { ok: false; error: string } {
  const result = validateSceneFragmentJson(form.sceneJson);

  if (!result.ok) {
    return { ok: false, error: "Fix validation issues before saving." };
  }

  if (!form.name.trim() || !form.description.trim()) {
    return { ok: false, error: "Name and description are required." };
  }

  return {
    ok: true,
    payload: {
      name: form.name.trim(),
      category: normalizeCategory(form.category),
      description: form.description.trim(),
      tags: form.tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      semanticKeywords: form.semanticKeywords
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
      aiPromptSeed: form.aiPromptSeed.trim() || undefined,
      sceneJsonFragment: result.value,
      isPublic: form.isPublic,
    },
  };
}
